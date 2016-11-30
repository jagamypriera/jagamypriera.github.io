var myApp = angular.module('app', ['angularMoment']);
/*myApp.filter('roundup', function() {
    return function(input) {
        return input.toFixed(2);
    };
});*/
myApp.filter('cut', function () {
        return function (value, wordwise, max, tail) {
            if (!value) return '';

            max = parseInt(max, 10);
            if (!max) return value;
            if (value.length <= max) return value;

            value = value.substr(0, max);
            if (wordwise) {
                var lastspace = value.lastIndexOf(' ');
                if (lastspace != -1) {
                  //Also remove . and , so its gives a cleaner result.
                  if (value.charAt(lastspace-1) == '.' || value.charAt(lastspace-1) == ',') {
                    lastspace = lastspace - 1;
                  }
                  value = value.substr(0, lastspace);
                }
            }

            return value + (tail || ' …');
        };
    });
myApp.filter('unsafe', function() {
    return function(val) {
        return val.replace(/\\n|\\"/g, '<br>');
    };
});
myApp.controller('projects_controller', ['$scope', function($scope) {
    $scope.turnOn = function() {
        NProgress.start();
        $.get(window.location.pathname+"/api", function(data) {
            data = $.parseJSON(data)
            $scope.$apply(function() {
                $scope.items = data;
                angular.forEach($scope.items.jobs, function(val, index) {
                    $scope.items.jobs[index].branches = [];
                    console.log($scope.items.jobs.length)
                    $scope.getBranches($scope.items.jobs[index].name, index)
                });
                
            });
        }).fail(function(data) {
            NProgress.done();
            console.log(data.status, data.statusText);
        });
    };
    $scope.turnOn();
    $scope.getBranches = function(projectsName, index) {
        $.get(projectsName+"/api", function(data) {
            data = $.parseJSON(data);
            $scope.$apply(function() {
                angular.forEach(data.jobs, function(val) {
                    $scope.items.jobs[index].branches.push(val.name);
                });
            });
            console.log($scope.items);
            console.log(index);
            NProgress.done();
        }).fail(function(data) {
            NProgress.done();
            console.log(data.status, data.statusText);
        });
    };
}]);
myApp.controller('branch_controller', ['$scope','$timeout', function($scope,$timeout) {
    $scope.buildText='Build';
    $scope.getHistories = function() {
        NProgress.start();
        $.get(window.location.pathname+"/api/", function(data) {
            data = $.parseJSON(data);
            $scope.$apply(function() {
                $scope.histories = data;
                console.log(data);
                if(data.lastCompletedBuild!=null)
                    if(data.lastBuild.number>data.lastCompletedBuild.number){
                        $scope.histories.builds[0].loading=true;
                        $scope.isBuilding=true;
                    }else{
                        $scope.isBuilding=false;
                    }
                    console.log($scope.histories.builds[0]);
                });
            NProgress.done();
        }).fail(function(data) {
            NProgress.done();
            console.log(data.status, data.statusText);
        });
    };
    function checkForCurrentBuild() {
        $.get(window.location.pathname+"/api/", function(data) {
            data = $.parseJSON(data);
            $scope.$apply(function() {
                $scope.histories = data;
                if(data.lastCompletedBuild!=null)
                    if(data.lastBuild.number>data.lastCompletedBuild.number){
                        $scope.histories.builds[0].loading=true;
                        $scope.isBuilding=true;
                        $timeout(checkForCurrentBuild, 3000);
                    //setInterval($scope.checkForCurrentBuild(), 3000);
                    //setTimeout($scope.checkForCurrentBuild(), 5000);
                    $scope.buildText='Building...';
                }else{
                    $scope.isBuilding=false;
                    $('#build').prop('disabled', false);
                    $scope.buildText='Build';
                    console.log("done");
                }
            });
        }).fail(function(data) {
            NProgress.done();
            console.log(data.status, data.statusText);
        });
    };
    checkForCurrentBuild();
    $scope.build = function() {
        $.get(window.location.pathname+"/build/", function(data, textStatus, xhr) {
            if(data.result != null){
                toastr.error(data.message);
            }
            if(xhr.status==200){
                $('#build').prop('disabled', true);
                $scope.$apply(function() {
                    $scope.buildText='Please wait...';
                })
                
                (function doStuff() {
                  $.get(window.location.pathname+"/api/", function(data) {
                    data = $.parseJSON(data);
                    if(data.lastBuild.number==data.lastCompletedBuild.number){
                        console.log("please wait");
                        $timeout(doStuff, 3000);
                        //setInterval(doStuff, 3000);
                        //setTimeout(doStuff, 5000);
                    }else{
                       checkForCurrentBuild();
                   }
               }).fail(function(data) {
                NProgress.done();
                console.log(data.status, data.statusText);
            });

           }());
            }
        }).fail(function(data) {
            NProgress.done();
            console.log(data.status, data.statusText);
        });
    };
    $scope.getDetails = function(buildNumber) {
        NProgress.start();
        $.get(window.location.pathname+"/"+buildNumber.value.number+"/"+"api/", function(data) {
            console.log(data);
            data = $.parseJSON(data);
            $scope.$apply(function() {
                console.log(data);
                $scope.details = data;
                $scope.getComments( $scope.details);
            });
        }).fail(function(data) {
            NProgress.done();
            console.log(data.status, data.statusText);
        });
    };
    $scope.comment={
        text:""
    };
    $scope.sendComment = function(comment, details) {
        NProgress.start();
        $.post("/comment/create/api", {
            _token:window.Laravel.csrfToken,
            text:comment.text,
            branch:details.additional.branch,
            build_number:details.additional.buildNumber,
            project:details.additional.project
        }, function(data) {
            NProgress.done();
            $scope.$apply(function() {
                $scope.comment.text="";
                $scope.comments.push(data);
            });
            
           $scope.getComments( details);
       }).fail(function(data) {
        console.log(data.status, data.statusText);
    });
   };
   $scope.getComments = function( details) {
    $.post("/comment/all/api", {
        _token:window.Laravel.csrfToken,
        branch:details.additional.branch,
        build_number:details.additional.buildNumber,
        project:details.additional.project
    }, function(data) {
        $scope.$apply(function() {
            console.log(data);
            $scope.comments=data;

        });
        NProgress.done();
    }).fail(function(data) {
        NProgress.done();
        console.log(data.status, data.statusText);
    });
};
}]);