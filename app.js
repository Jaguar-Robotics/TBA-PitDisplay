var http = require('http');
var url  = require('url');
var fs   = require('fs');
var handlebars = require('handlebars');
var axios = require('axios');
process.config = require("./config.json")
var teamNum = process.config.teamNumber;
var token = process.config.tba_key;

handlebars.registerHelper("printTime", function(timestamp) {
    var date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' }) + " PST";
});

handlebars.registerHelper("slice", function(team){
    var sliced = team.slice(3);
    if (sliced === teamNum) {
        return "<b>" + teamNum + "</b>";
    } else {
        return sliced;
    }
    
});

handlebars.registerHelper("winner", function(winner){
    if(winner === "red"){
        return "red";
    }else if(winner === "blue"){
        return "blue";
    }else{
        return "green";
    }
})

handlebars.registerHelper("removeFRC", function(team){
    return team.slice(3);
})

http.createServer(async (req, res) => {

    var path = url.parse(req.url).pathname;

    var api_path = "";
    var template_name = "";

    var request = await axios.get('https://frc-api.firstinspires.org/v2.0')
    console.log('frc-api.firstinspires.org:' + request.status)
    var season = request.data.currentSeason.toString()



    if (path === '/events' || path === "/events/") {
        api_path = `/api/v3/team/frc${teamNum}/events/${season}/simple`;
        template_name = 'events.html';
    } else if (path.startsWith('/matches/')) {
        var eventCode = path.split('/')[2];
        api_path = '/api/v3/team/frc' + teamNum + '/event/' + season + eventCode + '/matches/simple';
        template_name = 'matches.html';
    } else if (path.startsWith('/stream/')){
        var event = path.split('/')[2];
        api_path = '/api/v3/event/' +season + event
        template_name = 'stream.html';
    } else if (path.startsWith('/events/')) {
        var eventnum = path.split('/')[2];
        api_path = '/api/v3/event/' + season + eventnum;
        template_name = 'options.html';
    }else if (path === "/") {
        template_name = "index.html";
    } else {
        template_name = "404.html";
    }

    var template = handlebars.compile(fs.readFileSync('templates/header.html', 'utf8') + fs.readFileSync('templates/' + template_name, 'utf8'));

    if (api_path) {
        axios({
            method: 'GET',
            url: 'https://thebluealliance.com' + api_path,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'frc2022',
                'X-TBA-Auth-Key': token
            }
        }).then(function(response){
            console.log('thebluealliance.com:'+response.status)
            if(response && response.status === 200) {
                if (template_name === 'matches.html'){
                    response.data.sort(function(a, b){
                        return a.match_number - b.match_number
                })
                res.end(template({'data': response.data}))
                
            } else{
                res.end(template({'data': response.data}))
            }
        }
            else{
                res.end(template({}))
            }
        }).catch(function(error){
            console.log(error)
        })
    } else {
        res.end(template({}));
    }
}).listen(process.config.port);
