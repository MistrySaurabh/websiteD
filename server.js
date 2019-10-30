global.express = require('express');  
global.app = express();
var http = require('http').Server(app);
global.io = require('socket.io')(http);
global.request = require('requestretry');

global.fs=require('fs');
global.path = require('path')
global._ =require('underscore');
global.async=require('async');
global.Crawler=require('simplecrawler');
global.bodyParser=require('body-parser')
global.requireTree =require('require-tree')
global.url = require('url');
global.mkdirp=require('mkdirp')
global.rootdir=__dirname;
global.scrape = require('website-scraper');
global.cheerio = require('cheerio')
global.archiver = require('archiver');
global.randomUseragent = require('random-useragent');
global.moment = require('moment')
global.fsExtra = require('fs-extra')


let folders = ['controllers','helpers'];
for (let name of folders) {
  global[name] = requireTree(`${rootdir}/${name}`);
}

app.use(express.static('public'))
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '50mb',
    parameterLimit: 100000
  }))
  app.use(bodyParser.json({
    limit: '50mb',
    parameterLimit: 100000
  }))


io.on('connection',function(socket) {
 
 
 socket.on('join', function(url){
      if(url){
         var website_crawl_task = new helpers.WebsiteCrawler(url,socket);
      }
  });

   socket.on('disconnect', function () {
     console.log('A user disconnected');
   });

  /* socket.emit('logs',{
    logs: logs
  }) */
});

//io.of('/crawlers').on('connection',helpers.CrawlerSocket)

app.get('/',(req,res)=>{
    res.render('index');
});

app.get('/testing',(req,res)=>{
});


app.get('/download/:id',(req,res)=>{
  if(req.params.id){
    let filePath=rootdir+'/public/'+req.params.id;
    if(fs.existsSync(filePath)){
      res.setHeader('Content-Type', 'application/zip');
      res.download(filePath);
    }else{
        res.send('File not found');
    }
  }
});

http.listen(3333, () => console.log('app is running on port 3333!'))
// how to run app ? 
// node server.js