var listeApp = angular.module('listeApp', ['ngSanitize','ngMaterial'])
                        .service('recettesService', function($http){
                            this.getRecettesJsonData = function() {
                                var res = {};
                                return $http({method: "GET", url: "/recettes.json"});
                            };
                            this.getRecettesMatinJsonData = function() {
                                var res = {};
                                return $http({method: "GET", url: "/matin.json"});
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
    recettesService.getRecettesJsonData().then(function (r) { $scope.recettes = r.data['recettes']});
    recettesService.getRecettesMatinJsonData().then(function (r) { $scope.recettes_matin = r.data['recettes']});
    $scope.nb_jours = "5"; // srsly!
    $scope.nb_gens = "10"; // srsly!
    $scope.jours_tab = range(20);
    $scope.gens_tab = range(25);

    $scope.gens_par_matin = new Array( parseInt($scope.nb_jours)).fill($scope.nb_gens);
    $scope.recette_matin_par_jour = new Array( parseInt($scope.nb_jours)).fill("");
    $scope.gens_par_diner = new Array( parseInt($scope.nb_jours)).fill($scope.nb_gens);
    $scope.recette_diner_par_jour = new Array( parseInt($scope.nb_jours)).fill("");
    $scope.gens_par_dejeuner = new Array( parseInt($scope.nb_jours)).fill($scope.nb_gens);
    $scope.recette_dejeuner_par_jour = new Array( parseInt($scope.nb_jours)).fill("");

    var liste_json=[];

    $scope.loadStoredList = function(l, name) {
        var rr = l['recettes'];
        for (var i = 0 ; i < rr.length; i++) {
            $scope.recette_matin_par_jour[i] = rr[i]['matin']['recette'];
            $scope.gens_par_matin[i] = rr[i]['matin']['gens'];
            $scope.recette_dejeuner_par_jour[i] = rr[i]['dejeuner']['recette'];
            $scope.gens_par_dejeuner[i] = rr[i]['dejeuner']['gens'];
            $scope.recette_diner_par_jour[i] = rr[i]['diner']['recette'];
            $scope.gens_par_diner[i] = rr[i]['diner']['gens'];
        };
        $scope.updateListe();
    };

    getAll = function() {
        var _recettes = [];
        for (var i = 0; i < $scope.nb_jours; i++) {
            var jour = {'matin': {'recette':null, 'gens':0 }, 'diner': {'recette': null, 'gens': 0}, 'dejeuner': {'recette': null, 'gens': 0}};
            recette_matin = $scope.recette_matin_par_jour[i];
            recette_dejeuner = $scope.recette_dejeuner_par_jour[i];
            recette_diner = $scope.recette_diner_par_jour[i];
            jour['matin']['recette'] = recette_matin;
            jour['matin']['gens'] = parseInt($scope.gens_par_matin[i]);
            jour['dejeuner']['recette'] = recette_dejeuner;
            jour['dejeuner']['gens'] = parseInt($scope.gens_par_dejeuner[i]);
            jour['diner']['recette'] = recette_diner;
            jour['diner']['gens'] = parseInt($scope.gens_par_diner[i]);

            _recettes.push(jour);
        }
        return _recettes;
    };

    $scope.updateListe = function() {
        liste_json=[];
        for (var i = 0; i < $scope.nb_jours; i++) {
            recette_matin = $scope.recette_matin_par_jour[i];
            g = parseInt($scope.gens_par_matin[i]);
            if (recette_matin != "") {
                var ings = getIngredientsMatin(recette_matin);
                for (ing in ings) {
                    ingredient = ings[ing];
                    addToListe(liste_json, ingredient, g);
                }
            }

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

        for (var i in $scope.extras) {
            var liste_extras_json = [];
            var e = $scope.extras[i];
            if (e.enabled) {
                if (typeof e.calc_qty !== "undefined") {
                    e.qty = e.calc_qty();
                }
                addToListe(liste_json, e, 1);
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
            var nb = parseInt($scope.nb_jours);
            $scope.gens_par_matin = new Array(nb).fill(n);
            $scope.gens_par_dejeuner = new Array(nb).fill(n);
            $scope.gens_par_diner = new Array(nb).fill(n);
            $scope.recette_matin_par_jour = new Array($scope.nb_jours);
            $scope.recette_diner_par_jour = new Array($scope.nb_jours);
            $scope.recette_dejeuner_par_jour = new Array( $scope.nb_jours);
        }

    }
    $scope.joursChanged();

    getIngredientsMatin = function(r) {
        for (a in $scope.recettes_matin) {
            recette = $scope.recettes_matin[a];
            if (recette.name == r) {
                return recette.ingredients;
            }
        }
    }

    getIngredients = function(r) {
        for (a in $scope.recettes) {
            recette = $scope.recettes[a];
            if (recette.name == r) {
                return recette.ingredients;
            }
        }
    }

    arrondi = function(nb, unit) {
        if (nb == null){return unit;}
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
        if (nb > 10) {
            return Math.round(nb)+""+unit;
       } else {
           return nb+unit;
       }
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
    $scope.extras = [
        {"name": "PQ", enabled:false,
            calc_qty:function() {return parseInt($scope.nb_jours) * 6 },
            unit:" rouleau (6*nb jours)"},
        {"name": "Saucisson", enabled:false,
            calc_qty:function() {return parseInt($scope.nb_jours) * 3 },
            unit:" saucissons (3*nb jours)"},
        {"name": "Gateau apéro", enabled:false,
            calc_qty:function() {return parseInt($scope.nb_jours) * 3 },
            unit:" saucissons (3*nb jours)"},
        {"name": "Gateau apéro", enabled:false,
            calc_qty:function() {return parseInt($scope.nb_jours) * 3 },
            unit:" Paquets divers (chips, bretzels, etc) (3*nb jours)"},
        {"name": "Sacs poubelle", enabled:false,
            calc_qty:function() {return Math.round(parseInt($scope.nb_jours) * 0.3) },
            unit:" rouleaux (3 sacs * nb jours)"},
        {"name": "Torchons", enabled:false,
            calc_qty:function() {return 2 },
            unit:" "},
        {"name": "Produit vaisselle", enabled:false,
            calc_qty:function() {return Math.ceil(parseInt($scope.nb_jours) / 5) },
            unit:" bidon (1 pour 5 jours)"},
        {"name": "Pastille lave-vaisselle", enabled:false,
            calc_qty:function() {return parseInt($scope.nb_jours) * 2 },
            unit:" (2*nb jours)"},
        {"name": "Fruits divers", enabled:false,
            calc_qty:function() {return parseInt($scope.nb_jours) / 2 },
            unit:" kg (0.5*nb jours)"},
        {"name": "Yaourts", enabled:false,
    // TODO avoir une moyenne de gens par jour
            calc_qty:function() {return parseInt($scope.nb_jours)  },
            unit:" * nb_gens == nb pots"},
        {"name": "Crème de marron", enabled:false,
        // TODO avoir une moyenne de gens par jour
            calc_qty:function() {return parseInt($scope.nb_jours) * 3 },
            unit:" Plein (1 plein par jour)"},
        {"name": "Capitaaaaaine", enabled: false,
            calc_qty:function() {return parseInt($scope.nb_jours) / 2  },
            unit:" bouteilles (1 pour 2 jours)"},
    ];
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


