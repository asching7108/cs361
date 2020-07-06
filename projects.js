module.exports = function(){
    var express = require('express');
    var router = express.Router();
    

    /* Add Project */
    router.post('/', function(req, res){
        var mysql = require('./dbcon.js');
        var sql = "INSERT IGNORE INTO Projects (Project_Name, Status) VALUES (?,?)";
   
        var inserts = [req.body.Project_Name, req.body.Status];
        sql = mysql.pool.query(sql,inserts,function(error, results, fields){
            if(error){
                console.log(JSON.stringify(error))
                res.write(JSON.stringify(error));
                res.end();
            }else{
                if (results.insertId) {
                    var projectId = results.insertId;
                    var usersAssigned = req.body.user;
                    updateProjectUsersTable(res, projectId, usersAssigned);
                    //res.redirect('projects');
                }
            }
        });
    });

    // on project submit, add users to the user_projects table
    function updateProjectUsersTable(res, projectId, usersAssigned) {
        var mysql = require('./dbcon.js');
 
        var count = 0;
        var lengthUsers = usersAssigned.length;
        usersAssigned.forEach(function(userId) {
            mysql.pool.query("INSERT INTO user_projects (user_id, project_id) VALUES (?,?)",
            [userId, projectId],
            function(err,result) {
                if (err) {
                    console.log(JSON.stringify(err));
                    res.write(JSON.stringify(err));
                    res.end();
                } else {
                    count++;
                    if (count == lengthUsers) {
                        res.redirect('projects');
                    }
                }
            });
        })
    }

    // function that returns the entire list of users as a promise
    function getUsers() {
        var mysql = require('./dbcon.js');
       
        return new Promise((resolve) => {
            mysql.pool.query("SELECT id, name, email FROM users", function(error,results) {
                if(error){
                    res.write(JSON.stringify(error));
                    res.end();
                } else {
                    resolve(results)
                }
            })
        });
      }
      // function that awaits the promise to resolve for the users list
      // then renders the projects page upon result
      async function renderProjectsPage(res,context) {
        const result = await getUsers();
        context.users = result;
        res.render('projects', context);
    }
 
    /* function to display all PROJECTS */
    function getProjects(res, mysql, context, complete){
        var mysql = require('./dbcon.js');
        mysql.pool.query("SELECT Project_ID, Project_Name, Due_Date, Status FROM Projects", function(error, results, fields){
            if(error){
                res.write(JSON.stringify(error));
                res.end();
            }
            context.projects = results;
            complete();
        });
    }
      

    /* Display all PROJECTS */
    router.get('/', function(req, res){
        var callbackCount = 0;
        var context = {};
        context.jsscripts = ["deleteproject.js"];
        var mysql = req.app.get('mysql');
        getProjects(res, mysql, context, complete);
         function complete(){
            callbackCount++;
            if(callbackCount >= 1){
                renderProjectsPage(res,context);
            }
        }
    });

    /* Route to DELETE specified Project */
    // TODO: on delete, remove users where project_id = ? from user_projects table
    router.delete('/:id', function(req, res){
        // var mysql = req.app.get('mysql');
        var mysql = require('./dbcon.js');
        var sql = "DELETE FROM Projects WHERE Project_ID = ?";
        var inserts = req.params.id;
        sql = mysql.pool.query(sql, inserts, function(error, results, fields){
            if(error){
                res.write(JSON.stringify(error));
                res.status(400);
                res.end();
            } else {
                res.status(202).end();
            }
        })
    });

    return router;

}();