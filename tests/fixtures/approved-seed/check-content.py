#!/usr/bin/env python3
"""Read-only content parity check for the standalone Pinsel client review.

Usage: python3 check-content.py [--root /path/to/dist] [--report /path.json]
Returns 1 for missing routes/body/shared copy/record occurrences/links, 0 otherwise.
Metadata differences are reported separately; --strict-metadata makes them failures.
This does not certify visual, motion, form-delivery, or accessibility behavior.
"""
import argparse, collections, html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urljoin

HERE=Path(__file__).parent
def norm(s):return re.sub(r'\s+','',html.unescape(s))
class Node:
    def __init__(self,tag='',attrs=(),parent=None):self.tag=tag;self.attrs=dict(attrs);self.parent=parent;self.children=[]
    def text(self):
        if self.tag in {'script','style','svg','noscript'} or self.attrs.get('aria-hidden')=='true':return ''
        return ''.join(c if isinstance(c,str) else c.text() for c in self.children)
    def all(self,tag):
        out=[self] if self.tag==tag else []
        for c in self.children:
            if isinstance(c,Node):out+=c.all(tag)
        return out
class Document(HTMLParser):
    VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
    def __init__(self,text):super().__init__(convert_charrefs=True);self.root=Node();self.current=self.root;self.feed(text)
    def handle_starttag(self,tag,attrs):
        node=Node(tag,attrs,self.current);self.current.children.append(node)
        if tag not in self.VOID:self.current=node
    def handle_startendtag(self,tag,attrs):self.current.children.append(Node(tag,attrs,self.current))
    def handle_endtag(self,tag):
        node=self.current
        while node.parent and node.tag!=tag:node=node.parent
        if node.parent:self.current=node.parent
    def handle_data(self,data):self.current.children.append(data)

def output_file(root,route):
    if route=='/404.html':
        for p in [root/'404.html',root/'404/index.html']:
            if p.is_file():return p
        return root/'404.html'
    return root/route.strip('/')/'index.html'

def has_link(anchors,expected,route):
    if expected.startswith('http'):return any(a.attrs.get('href')==expected for a in anchors)
    want=urlparse(expected);target=want.path
    for a in anchors:
        href=a.attrs.get('href','');u=urlparse(urljoin('https://prototype.local'+route,href))
        if u.netloc!='prototype.local':continue
        p=u.path
        if p.endswith('/index.html'):p=p[:-10]
        if not p.endswith('/') and not p.endswith('.html'):p+='/'
        if p==target and (not want.fragment or u.fragment==want.fragment):return True
    return False

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=HERE.parent/'dist')
    parser.add_argument('--report',type=Path,default=HERE/'parity-report.json')
    parser.add_argument('--strict-metadata',action='store_true')
    args=parser.parse_args();manifest=json.loads((HERE/'expected-content.json').read_text())
    report={'root':str(args.root),'source':manifest['source'],'pages':[],'summary':{}}
    for page in manifest['pages']:
        route=page['route'];p=output_file(args.root,route)
        row={'route':route,'file':str(p),'missingCopy':[],'recordIssues':[],'linkIssues':[],'metadataIssues':[],'sharedIssues':[]}
        if not p.is_file():row['missingFile']=True;report['pages'].append(row);continue
        dom=Document(p.read_text()).root;main_nodes=dom.all('main');main_node=main_nodes[0] if main_nodes else dom
        main_text=norm(main_node.text());body_text=norm(dom.text());anchors=dom.all('a')
        for item in page['body']:
            if norm(item['text']) not in main_text:row['missingCopy'].append(item)
        footers=dom.all('footer');footer_text=norm(''.join(x.text() for x in footers))
        for item in manifest['shared']['footer']:
            if norm(item['text']) not in footer_text:row['sharedIssues'].append(item)
        for link in manifest['shared']['destinations']+page['links']:
            if not has_link(anchors,link['href'],route):row['linkIssues'].append(link)
        if not has_link(anchors,manifest['shared']['instagram'],route):row['linkIssues'].append({'href':manifest['shared']['instagram'],'kind':'instagram'})
        for group in page['recordGroups']:
            group_text=main_text
            if 'year' in group:
                marker=norm(group['year'])
                headings=[h for level in ['h2','h3','h4'] for h in main_node.all(level) if marker in norm(h.text())]
                if not headings:row['recordIssues'].append({'group':group['label'],'issue':'Missing year heading','text':group['year']});continue
                container=headings[0].parent
                while container.parent and container.tag not in {'section','article'}:container=container.parent
                group_text=norm(container.text())
                if norm(str(group['declaredCount'])+'件') not in group_text:row['recordIssues'].append({'group':group['label'],'issue':'Missing declared count','text':str(group['declaredCount'])+'件'})
            counts=collections.Counter()
            for record in group['items']:
                for k,v in record.items():
                    if isinstance(v,str):counts[v]+=1
            for text,required in counts.items():
                found=group_text.count(norm(text))
                if found<required:row['recordIssues'].append({'group':group['label'],'source':group['source'],'text':text,'requiredOccurrences':required,'foundOccurrences':found})
            if 'year' in group:
                pairs=collections.Counter((record['school'],record['department']) for record in group['items'])
                for (school,department),required in pairs.items():
                    found=group_text.count(norm(school)+norm(department))
                    if found<required:row['recordIssues'].append({'group':group['label'],'source':group['source'],'issue':'School/department pair missing or no longer adjacent in reading order','school':school,'department':department,'requiredOccurrences':required,'foundOccurrences':found})
        titles=dom.all('title');actual_title=titles[0].text() if titles else ''
        descriptions=[m.attrs.get('content','') for m in dom.all('meta') if m.attrs.get('name')=='description']
        actual={'title':actual_title,'description':descriptions[0] if descriptions else ''}
        for k,v in page['metadata'].items():
            if norm(actual[k])!=norm(v):row['metadataIssues'].append({'field':k,'expected':v,'actual':actual[k]})
        row['pass']=not(any(row[k] for k in ['missingCopy','recordIssues','linkIssues','sharedIssues']) or (args.strict_metadata and row['metadataIssues']))
        report['pages'].append(row)
    report['summary']={'pages':len(report['pages']),'passed':sum(bool(p.get('pass')) for p in report['pages']),'missingFiles':sum(bool(p.get('missingFile')) for p in report['pages']),'missingCopy':sum(len(p['missingCopy']) for p in report['pages']),'recordIssues':sum(len(p['recordIssues']) for p in report['pages']),'linkIssues':sum(len(p['linkIssues']) for p in report['pages']),'sharedIssues':sum(len(p['sharedIssues']) for p in report['pages']),'metadataIssues':sum(len(p['metadataIssues']) for p in report['pages'])}
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report['summary'],ensure_ascii=False))
    for page in report['pages']:
        if page.get('missingFile'):print(page['route'],'MISSING FILE');continue
        for kind in ['missingCopy','recordIssues','linkIssues','sharedIssues','metadataIssues']:
            for issue in page[kind]:print(page['route'],kind,json.dumps(issue,ensure_ascii=False))
    print('Report:',args.report)
    return 0 if report['summary']['passed']==report['summary']['pages'] else 1
if __name__=='__main__':sys.exit(main())
