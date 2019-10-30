
class WebsiteCrawler{
    constructor(websiteurl,socket) {
        var that = this;
        this.websiteurl=new URL(websiteurl);
        this.id;
        this.socket = socket;
        
        if(!helpers.isURL(this.websiteurl.href)){
            that.print_error("Error : Invalid URL entered");
        }
        this.boot();
    }

    print_event_log(msg){
        this.socket.emit('event_log',{message: msg});
    }

    print_error(msg){
        this.socket.emit('error',{message: msg});
    }

    boot(){
        let that=this;
        let projectFolder=this.websiteurl.hostname+"-"+ moment().unix();
        that.socket.emit('live',true);

        mkdirp(rootdir+'/public/'+projectFolder, function (err) {
            if (err) {
                that.print_error("Error Creating Project Directory");
            }
            else {
                let msg=projectFolder + '- Project Directory Created';
                console.log(msg);
                that.print_event_log(msg);
            }
        });
       

        global.crawler = Crawler(this.websiteurl.href)
        crawler.interval = 10
        crawler.maxDepth = 3
        crawler.maxConcurrency = 10;
        crawler.ignoreInvalidSSL = true;
        crawler.scanSubdomains = true;
        crawler.parseScriptTags = true;
        crawler.downloadUnsupported = true;
        crawler.acceptCookies=true
        crawler.ua=randomUseragent.getRandom(); 
      
        crawler.on("crawlstart",()=>{
            that.print_event_log("Website crawling started...");
        });

        crawler.on("fetchcomplete", function(item, body, response){
            console.log(item.url);       
            var mime = item.stateData.contentType|| false;
            var code = item.stateData.code;

            let webpageURL = new URL(item.url);
            var rest = webpageURL.pathname.substring(0, webpageURL.pathname.lastIndexOf("/") + 1);
            var last = webpageURL.pathname.substring(webpageURL.pathname.lastIndexOf("/") + 1, webpageURL.pathname.length);
            let dirPath=rootdir+'/public/'+projectFolder+'/'+rest;
            console.log('last==',last);

            if(last!='/' && last.length>0){
                that.print_event_log('Fetching -'+webpageURL);
                that.checkDirMakeDownload(dirPath,webpageURL,last);
            }
    
            if(mime=="text/html"){
                var $ = cheerio.load(body.toString());
                let linkHrefs= $('link').map(function(i) {
                    let link=$(this).attr('href');
                    if(link && link.startsWith('.') && link.endsWith(".css")){
                      return helpers.getAbsolutePath(item.url,link);
                    }
                }).get();
         
                let scriptSrcs= $('script').map(function(i) {
                   let jsscript= $(this).attr('src');
                   if(jsscript && jsscript.startsWith('.') && jsscript.endsWith(".js")){
                     return helpers.getAbsolutePath(item.url,jsscript);
                   }
                }).get();

                _.each(linkHrefs,(link)=>{
                    let cssLink = new URL(link);
                    var cssrest = cssLink.pathname.substring(0, cssLink.pathname.lastIndexOf("/") + 1);
                    var csslast = cssLink.pathname.substring(cssLink.pathname.lastIndexOf("/") + 1, cssLink.pathname.length);
                    let cssdir=rootdir+'/public/'+projectFolder+'/'+cssrest;
                    that.checkDirMakeDownload(cssdir,cssLink,csslast);
                });

                _.each(scriptSrcs,(jssrc)=>{
                    let jsLink = new URL(jssrc);
                    var jsrest = jsLink.pathname.substring(0, jsLink.pathname.lastIndexOf("/") + 1);
                    var jslast = jsLink.pathname.substring(jsLink.pathname.lastIndexOf("/") + 1, jsLink.pathname.length);
                    let jsdir=rootdir+'/public/'+projectFolder+'/'+jsrest;
                    that.checkDirMakeDownload(jsdir,jsLink,jslast);
                });
            }
        });       
      
        crawler.on("discoverycomplete",(queueItem, resources)=>{
          console.log('discoverycomplete called');
        });
      
        crawler.on("fetchdisallowed",(queueItem)=>{
          console.log('fetchdisallowed called');
        })
      
        crawler.on('fetchredirect', function(item, buffer, response){
          var rUrl = response.headers.location;
             crawler.queueURL(rUrl);
        });

        crawler.on('log', function(msg){
            console.log(msg);
        })
      
        crawler.on('fetch404', function(item, buffer, response){
            console.log("fetch404");
            crawler.queueURL(item.url);
        });
      
        crawler.on('fetcherror', function(item, buffer, response){
             console.log("fetcherror");
             crawler.queueURL(item.url);
        });
      
        crawler.on('fetchtimeout', function(item,timeout){
            console.log("fetchtimeout");
            crawler.queueURL(item.url);
        });
      
        crawler.on('fetchclienterror', function(item, buffer, response){
            console.log("fetchclienterror");
            crawler.queueURL(item.url);
        });
      
        crawler.on('queueerror', function(err){
              console.log("QUEUE ERROR : "+err);
        });

        crawler.on('complete', function(){
            var archive = archiver('zip');
            let zippedFilename=projectFolder+'.zip';

            var output = fs.createWriteStream(rootdir +'/public/'+ zippedFilename);
            archive.pipe(output);
            archive.directory(rootdir +'/public/'+projectFolder, false);
            archive.finalize();
            archive.on('error', function (err) {
                that.print_error("Error Creating Zip File");
            });

            archive.on('finish', function (err) {
                 fsExtra.remove(rootdir+'/public/'+projectFolder, err => {
                    if (err) {}
                    else{ console.log('Project Folder successfully removed')}
                  })
                that.print_event_log('*************** ZIP file Ready to download  ***************');
                setTimeout(function(){
                    that.socket.emit('live',false);
                    that.socket.emit('download',{ready:true,link:'/download/'+projectFolder+'.zip'});
                },3000)
            });
        })
        
        crawler.start();
    }


    getStatusText(status, code){
        switch (status) {
            case 1: return "OK"; break;
            case 2: return "E_MAX_SIZE"; break;
            case 3: return "REDIRECT"; break;
            case 4: return "E_"+code; break;
            case 5: return "E_TIMEOUT"; break;
            case 6: return "E_INTERNAL"; break;
        }
    }

    checkDirMakeDownload(directoryPath,fileURL,fileName){
        this.print_event_log('Fetching -'+fileURL);

        if (!fs.existsSync(directoryPath)){
            mkdirp(directoryPath, function (err) {
              if (err) {
                that.print_error("Error Creating Directory "+directoryPath);
              }
              else {
                let extension=path.extname(fileName);
                let imageExtensions=['.JPEG','.JPG','.PNG','.GIF','.BMP','.TIFF','.SVG','.WOFF','.WOFF2','.TTF','.EOT'];

                let options={
                    url: fileURL,
                    maxAttempts: 10,  
                    retryDelay: 2000, 
                    retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
                    fullResponse: false
                }

                if(imageExtensions.indexOf(extension.toUpperCase())!=-1){
                    options={...options,encoding: 'binary'}
                }

                request(options).then(function (response) {
                    if(imageExtensions.indexOf(extension.toUpperCase())!=-1){
                        fs.writeFile(directoryPath+'/'+fileName,response,'binary',function(err){
                        });
                    }else{
                        fs.writeFile(directoryPath+'/'+fileName,response,function(err){
                        });
                    }
                  })
                  .catch(function(error) {
                    // error = Any occurred error
                  })
                 
              }
           });
          }else{
            let extension=path.extname(fileName);
            let imageExtensions=['.JPEG','.JPG','.PNG','.GIF','.BMP','.TIFF','.SVG','.WOFF','.WOFF2','.TTF','.EOT'];

            let options={
                url: fileURL,
                maxAttempts: 10,  
                retryDelay: 2000, 
                retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
                fullResponse: false
            }

            if(imageExtensions.indexOf(extension.toUpperCase())!=-1){
                options={...options,encoding: 'binary'}
            }

            request(options).then(function (response) {
                    
                    if(imageExtensions.indexOf(extension.toUpperCase())!=-1){
                        fs.writeFile(directoryPath+'/'+fileName,response,'binary',function(err){
                        });
                    }else{
                        fs.writeFile(directoryPath+'/'+fileName,response,function(err){
                        });
                    }
                 })
                 .catch(function(error) {
                  
                 })
                
          } 
    }

}

module.exports = WebsiteCrawler