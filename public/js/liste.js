var listeApp = angular.module('listeApp', ['ngSanitize','ngMaterial'])
                        .service('recettesService', function($http){
                            this.getJsonData = function() {
                                var res = {};
                                return $http({method: "GET", url: "/recettes.json"});
                            }
                        })
                        .controller('ListeCtrl', ListeCtrl)
                        .controller('LoadCtrl', LoadCtrl);


range = function(max) {
    var res = [];
    for (var i=1; i<=max; i++) {res.push(i)};
    return res;
};

function ListeCtrl ($scope, $http, $mdDialog, recettesService) {
    recettesService.getJsonData().then(function (r) { $scope.recettes = r.data['recettes']});
    $scope.nb_jours = "5"; // srsly!
    $scope.nb_gens = "10"; // srsly!
    $scope.jours_tab = range(20);
    $scope.gens_tab = range(25);

    $scope.gens_par_diner = new Array( parseInt($scope.nb_jours)).fill($scope.nb_gens);
    $scope.recette_diner_par_jour = new Array( parseInt($scope.nb_jours)).fill("");
    $scope.gens_par_dejeuner = new Array( parseInt($scope.nb_jours)).fill($scope.nb_gens);
    $scope.recette_dejeuner_par_jour = new Array( parseInt($scope.nb_jours)).fill("");

    var liste_json=[];

    $scope.loadStoredList = function(l, name) {
        var rr = l['recettes'];
        for (var i = 0 ; i < rr.length; i++) {
            $scope.recette_dejeuner_par_jour[i] = rr[i]['dejeuner']['recette'];
            $scope.recette_diner_par_jour[i] = rr[i]['diner']['recette'];
            $scope.gens_par_dejeuner[i] = rr[i]['dejeuner']['gens'];
            $scope.gens_par_diner[i] = rr[i]['diner']['gens'];
        };
        $scope.updateListe();
    };

    getAll = function() {
        var _recettes = [];
        for (var i = 0; i < $scope.nb_jours; i++) {
            var jour = {'diner': {'recette': null, 'gens': 0}, 'dejeuner': {'recette': null, 'gens': 0}};
            recette_dejeuner = $scope.recette_dejeuner_par_jour[i];
            recette_diner = $scope.recette_diner_par_jour[i];
            jour['dejeuner']['recette'] = recette_dejeuner;
            jour['diner']['recette'] = recette_diner;
            jour['dejeuner']['gens'] = parseInt($scope.gens_par_dejeuner[i]);
            jour['diner']['gens'] = parseInt($scope.gens_par_diner[i]);

            _recettes.push(jour);
        }
        return _recettes;
    };

    $scope.updateListe = function() {
        liste_json=[];
        for (var i = 0; i < $scope.nb_jours; i++) {
            recette_dejeuner = $scope.recette_dejeuner_par_jour[i];
            g = parseInt($scope.gens_par_dejeuner[i]);
            if (recette_dejeuner != "") {
                var ings = getIngredients(recette_dejeuner);
                for (ing in ings) {
                    ingredient = ings[ing];
                    addToListe(liste_json, ingredient, g);
                }
            }
            recette_diner = $scope.recette_diner_par_jour[i];
            g = parseInt($scope.gens_par_diner[i]);
            if (recette_diner != "") {
                var ings = getIngredients(recette_diner);
                for (ing in ings) {
                    ingredient = ings[ing];
                    addToListe(liste_json, ingredient, g);
                }
            }
        };
        changeListeText(liste_json);
    };

    changeListeText = function(j){
        h = "<ul>\n";
        for (var i in j) {
            var item = j[i];
            var qty_txt = arrondi(item.qty, item.unit);
            h += "<ul>"+item.name
            if (qty_txt == "") {
                h += "</ul>\n" ;
            } else {
                h += ": "+arrondi(item.qty, item.unit)+"</ul>\n" ;
            }
        }
        h+="</ul>";
        $scope.liste_html=h;
    }

    $scope.joursChanged = function() {
        $scope.jours = new Array(+$scope.nb_jours);
        var n = $scope.nb_gens_defaut;
        if (typeof n === "string") {
            $scope.gens_par_diner = new Array(parseInt($scope.nb_jours)).fill(n);
            $scope.recette_diner_par_jour = new Array( $scope.nb_jours);
            $scope.recette_dejeuner_par_jour = new Array( $scope.nb_jours);
        }

    }
    $scope.joursChanged();


    getIngredients = function(r) {
        for (a in $scope.recettes) {
            recette = $scope.recettes[a];
            if (recette.name == r) {
                return recette.ingredients;
            }
        }
    }

    arrondi = function(nb, unit) {
        if (unit == null){return '';}
        var n = 0;
        switch(unit) {
            case "g":
                if (nb>=1000) {
                    n = Math.round(nb / 100) / 10;
                    return n+"kg";
                }
                break;
            case "cL":
                if (nb>=100) {
                    n = Math.round(nb / 10) / 10;
                    return n+"L";
                }
                break;
        }
        return Math.round(nb)+""+unit;
    }

    addToListe = function(liste, ing, nb) {
        var found = false;
        for (i in liste) {
            var item = liste[i];
            if (item.name == ing.name) {
                if ('qty' in ing) {
                    item.qty = item.qty + (ing.qty * nb);
                }
                found = true;
            }
        }
        if (!found) {
            //need to dupe, wtf
            var item = {};
            item.name = ing.name;
            if ('qty' in ing) {
                item.qty = ing.qty * nb;
                item.unit = ing.unit;
            }
            liste.push(item);
        }
    }

    save = function(name) {
        var config = { headers : {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };
        $http({
            method: "POST",
            url: "/save",
            data:{'name' :name, "recettes": getAll()}
        }).then(
       function(response){
          // console.log('success');
           return response.body;
       },
       function(response){
           //console.log('fail');
       }
    );
    };
	$scope.showPromptSave = function(ev) {
        var confirm = $mdDialog.prompt()
        .title('Renseigner un nom pour la liste')
        .textContent('(ie: \'Kinzout 2019\')')
        .placeholder('Liste')
        .ariaLabel('Liste')
        .targetEvent(ev)
        .ok('Done!')
        .cancel('Cancel');

        $mdDialog.show(confirm).then(function(result) {
           save(result);
        }, function() {console.log("Echec de save la liste")});
    };

	$scope.showPromptLoad = function($event) {
        var parentEl = angular.element(document.body);
        var confirm = $mdDialog.show({
            parent: parentEl,
            targetEvent: $event,
            controller: LoadCtrl,
            scope: $scope,
            templateUrl: 'loadtemplate.html',
            preserveScope: true,
            locals: {load_liste: $scope.load_liste},
            clickOutsideToClose: true
        });
    };
};

function LoadCtrl ($scope, $mdDialog, $http){
    $scope.loadhide = function() {$mdDialog.hide();};
    $scope.loadcancel = function() {$mdDialog.cancel();};
    $scope.loadanswer = function(answer) {
        var liste_name = "";
        liste_name = $scope.liste_select;
        fetch_stored_liste(liste_name);
        $mdDialog.hide(answer);
    };
    function fetch_stored_liste(r) {
        $http({
            method: "GET",
            url: "/get-stored-liste?name="+r,
        }).then(
        function(response){
            $scope.loadStoredList(response.data, r);
        },
        function(response){
            console.log('liste load fail');
        }
        );
    };
    function fetch_recettes() {
        $http({
            method: "GET",
            url: "/get-stored-listes",
        }).then(
        function(response){
            var data = response.data;
            $scope.load_liste=[];
            for (var i =0; i< data.length; i++) {
                $scope.load_liste.push(data[i]['name']+" - "+data[i]['date']);
            };
            $scope.liste_select = $scope.load_liste[0];
        },
        function(response){
            console.log('liste load fail');
        }
        );
    };
    fetch_recettes();
};

