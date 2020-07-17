var express = require('express');
//var handlebars = require('express-handlebars').create({defaultLayout:'main'});
var mysql = require('./dbcon.js');
var bodyParser = require('body-parser');
var CryptoJS = require("crypto-js");
var path = require('path');
var session = require('express-session');
const AuthService = require('./auth-service.js');

var app = express();

app.use(session({
  secret: '7C44-74D44-WppQ3877S', // TODO: Move this into a configuration file.
  resave: true,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'handlebars');
app.set('port', process.argv[2]);

app.use('/auth', require('./auth-router.js'));

app.use('/projects', require('./projects.js'));

app.use('/project', require('./project.js'));

app.use('/task', require('./task.js'));


var handlebars = require('express-handlebars').create({
  helpers: {
    ifCond: function(v1,operator,v2,options) {
          switch (operator) {
          case '==':
              return (v1 == v2) ? options.fn(this) : options.inverse(this);
          case '===':
              return (v1 === v2) ? options.fn(this) : options.inverse(this);
          case '!=':
              return (v1 != v2) ? options.fn(this) : options.inverse(this);
          case '!==':
              return (v1 !== v2) ? options.fn(this) : options.inverse(this);
          case '<':
              return (v1 < v2) ? options.fn(this) : options.inverse(this);
          case '<=':
              return (v1 <= v2) ? options.fn(this) : options.inverse(this);
          case '>':
              return (v1 > v2) ? options.fn(this) : options.inverse(this);
          case '>=':
              return (v1 >= v2) ? options.fn(this) : options.inverse(this);
          case '&&':
              return (v1 && v2) ? options.fn(this) : options.inverse(this);
          case '||':
              return (v1 || v2) ? options.fn(this) : options.inverse(this);
          default:
              return options.inverse(this);
      }

  },
  },
  defaultLayout:'main'
  });

app.engine('handlebars', handlebars.engine);

app.get('/', function(req, res, next) {
  var context = {};
  res.render('signup', context);
});

app.get('/login', function(req, res, next) {
  const context = { email: '', password: '' };
  res.render('login', context);
});

app.post('/add-new-user', function(req, res) {
  mysql.pool.query(
    "SELECT id from users where email=" + mysql.pool.escape(req.body.user_email),
    function(err, result) {
      // if error, handle by outputting issue encountered
      if (err) {
        console.log(JSON.stringify(err));
        res.write(JSON.stringify(err));
        res.end();
      }
      // if id exists in the db, user already exists, don't proceed with sign up
      else if (result[0] && result[0].id) {
        res.render('signup', {
          errors: 'Email address already exists. Please login to your existing account or use a different email.',
        });
      }
      // we have a new user password we need to hash then add to the db
      else {
        var ciphertext = CryptoJS.AES.encrypt(req.body.user_password, 'secret key 123').toString();
        // TODO: Move the secret key to a configuration file. 
        // console.log(ciphertext);
        mysql.pool.query(
          "INSERT INTO users (name, email, password) VALUES (?,?,?)",
          [req.body.full_name, req.body.user_email, ciphertext],
          function(err, result) {
            if (err) {
              console.log(JSON.stringify(err));
              res.write(JSON.stringify(err));
              res.end();
            } else {
              const payload = { userId: result.insertId };
              // store auth token in session
              req.session.authToken = AuthService.createJwt(payload);
              res.redirect('/projects');
            }
          }
        );
      }
    }
  );
});

app.use(function(req,res){
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
