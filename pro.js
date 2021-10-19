// node pro.js --excel=excel.csv --datadir=data --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results"
let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
let args = minimist(process.argv);
let responsekapromise = axios.get(args.source);
responsekapromise.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matchscoredivs = document.querySelectorAll("div.match-score-block");
    let matches = [];
    for(let i =0;i<matchscoredivs.length;i++){
        let match = {
           t1 : "",
           t2 : "",
           t1s :"",
           t2s : "",
           result:""
        };
        let teamnames = matchscoredivs[i].querySelectorAll("div.name-detail>p.name");
        match.t1 = teamnames[0].textContent;
        match.t2 = teamnames[1].textContent;
        let teamscores = matchscoredivs[i].querySelectorAll("div.score-detail>span.score");
        if(teamscores.length==2){
            match.t1s = teamscores[0].textContent;
            match.t2s = teamscores[1].textContent;
        }
        else if(teamscores.length==1){
            match.t1s = teamscores[0].textContent;
            match.t2s = "";
        }
        else{
            match.t1s = "";
            match.t2s = "";
        }
        let teamresult = matchscoredivs[i].querySelector("div.status-text>span");
        match.result = teamresult.textContent;
        matches.push(match);
         }
         let matcheskajson = JSON.stringify(matches);
         fs.writeFileSync("matches.json",matcheskajson,"utf-8");
         let teams = []
         for(let i =0;i<matches.length;i++){
          addteamtoteamsarrayifalreadynotthere(teams,matches[i].t1);
          addteamtoteamsarrayifalreadynotthere(teams,matches[i].t2);
         }  
         for(let i =0;i<matches.length;i++){
             addmatchtospecificteam(teams,matches[i].t1,matches[i].t2,matches[i].t1s,matches[i].t2s,matches[i].result);
             addmatchtospecificteam(teams,matches[i].t2,matches[i].t1,matches[i].t2s,matches[i].t1s,matches[i].result);
         }  
         let teamskajson = JSON.stringify(teams);
         fs.writeFileSync("teams.json",teamskajson,"utf-8");
         preparefoldersandpdfs(teams,args.datadir);
})
function preparefoldersandpdfs(teams,datadir){
    if(fs.existsSync(datadir)==true){
        fs.rmdirSync(datadir,{recursive:true});
    }
    fs.mkdirSync(datadir);
    for(let i =0;i<teams.length;i++){
        let teamfoldername = path.join(datadir,teams[i].name);
        fs.mkdirSync(teamfoldername);
        for(let j =0;j<teams[i].matches.length;j++){
            let match = teams[i].matches[j];
            createscorecardpdf(teamfoldername,teams[i].name,match);
        }
    }
}
function createscorecardpdf(teamfoldername,hometeam,match){
    let matchfilename=path.join(teamfoldername,match.vs);
    let templatefilebytes = fs.readFileSync("template.pdf");
    let pdfkapromise = pdf.PDFDocument.load(templatefilebytes);
    pdfkapromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);
        page.drawText(hometeam,{
            x:320,
            y:660,
            size:8
        });
        
        page.drawText(match.vs,{
            x:320,
            y:630,
            size:8
        });
        page.drawText(match.homescore,{
            x:320,
            y:600,
            size:8
        });
        page.drawText(match.oppscore,{
            x:320,
            y:558,
            size:8
        });
        page.drawText(match.result,{
            x:320,
            y:523,
            size:8
        });
        let changebyteskapromise = pdfdoc.save();
        changebyteskapromise.then(function(changebytes){
            if(fs.existsSync(matchfilename+".pdf")==true){
                fs.writeFileSync(matchfilename+"1.pdf",changebytes);
            }
                else{
                    fs.writeFileSync(matchfilename+".pdf",changebytes); 
                }
            
            
        })
        
        

    })
}
function addmatchtospecificteam(teams,hometeam,oppteam,homescore,oppscore,result){
    let tidx = -1;
    for(let i =0;i<teams.length;i++){
        if(teams[i].name==hometeam){
            tidx = i;
            break;
        }
    }
    let team = teams[tidx];
    team.matches.push({
        vs:oppteam,
        homescore:homescore,
        oppscore:oppscore,
        result:result
    })
}
function addteamtoteamsarrayifalreadynotthere(teams,teamname){
    let tidx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==teamname){
            tidx=i;
            break;
        }
    }
    if(tidx==-1){
        teams.push({
            name:teamname,
            matches : []
        })
    }
}