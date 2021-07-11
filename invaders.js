var w = 800;
var h = 600;

var game = new Phaser.Game(w, h, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update });

function preload() {

    game.load.image('bullet', 'assets/games/invaders/bullet.png');
    game.load.image('enemyBullet', 'assets/games/invaders/enemy-bullet.png');
    game.load.spritesheet('invader', 'assets/games/invaders/invader32x32x4.png', 32, 32);
    game.load.image('ship', 'assets/games/invaders/player.png');
    game.load.spritesheet('kaboom', 'assets/games/invaders/explode.png', 128, 128);
    game.load.image('starfield', 'assets/games/invaders/starfield.png');
    game.load.image('background', 'assets/games/starstruck/background2.png');
    game.load.image('menu', 'assets/games/game/menu.png');

}

var player;
var aliens;
var bullets;
var bulletTime = 0;
var cursors;
var fireButton;
var explosions;
var starfield;
var score = 0;
var scoreString = '';
var scoreText;
var lives;
var enemyBullet;
var firingTimer = 0;
var stateText;
var livingEnemies = [];
var noMover

var distanciaBala;
var balaX;
var posActual;
var posAlien = [];
var movIzquierda;
var movDerecha;
var disparo;
var pendiente

var diferenciaX

/* Variables para IA */
var nnNetwork, nnEntrenamiento, nnSalida, datosEntrenamiento = [];
var modoAuto = false, eCompleto = false;

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);

    //  The scrolling starfield background
    starfield = game.add.tileSprite(0, 0, 800, 600, 'starfield');

    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    // The enemy's bullets
    enemyBullets = game.add.group();
    enemyBullets.enableBody = true;
    enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    enemyBullets.createMultiple(1, 'enemyBullet');
    enemyBullets.setAll('anchor.x', 0.5);
    enemyBullets.setAll('anchor.y', 1);
    enemyBullets.setAll('outOfBoundsKill', true);
    enemyBullets.setAll('checkWorldBounds', true);

    //  The hero!
    player = game.add.sprite(400, 500, 'ship');
    player.anchor.setTo(0.5, 0.5);
    game.physics.enable(player, Phaser.Physics.ARCADE);

    //  The baddies!
    aliens = game.add.group();
    aliens.enableBody = true;
    aliens.physicsBodyType = Phaser.Physics.ARCADE;

    createAliens();

    //  The score
    scoreString = 'Puntos : ';
    scoreText = game.add.text(10, 10, scoreString + score, { font: '34px Arial', fill: '#fff' });

    //  Lives
    lives = game.add.group();
    game.add.text(game.world.width - 100, 10, 'Lives : ', { font: '34px Arial', fill: '#fff' });

    //  Text
    stateText = game.add.text(game.world.centerX, game.world.centerY - 150, ' ', { font: '84px Arial', fill: '#fff' });
    stateText.anchor.setTo(0.5, 0.5);
    stateText.visible = false;

    /* Vidas  */
    for (var i = 0; i < 3; i++) {
        var ship = lives.create(game.world.width - 100 + (30 * i), 60, 'ship');
        ship.anchor.setTo(0.5, 0.5);
        ship.angle = 90;
        ship.alpha = 0.4;
    }

    //  An explosion pool
    explosions = game.add.group();
    explosions.createMultiple(30, 'kaboom');
    explosions.forEach(setupInvader, this);

    //  And some controls to play the game with
    cursors = game.input.keyboard.createCursorKeys();
    fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    //Pausa
    pausaL = game.add.text(w - 100, h - 50, 'Pausa', { font: '20px Arial', fill: '#fff' });
    pausaL.inputEnabled = true;
    pausaL.events.onInputUp.add(pausa, self);
    game.input.onDown.add(mPausa, self);

    /* Red:
     input layer:  2 neuronas
     2 layers ocultls: con 5 neuronas  
     output layer: 2 neuronas
     */
    nnNetwork = new synaptic.Architect.Perceptron(4,15,3);
    nnEntrenamiento = new synaptic.Trainer(nnNetwork);

    player.body.collideWorldBounds = true;

}

function createAliens() {

    for (var y = 0; y < 4; y++) {
        for (var x = 0; x < 10; x++) {
            var alien = aliens.create(x * 48, y * 50, 'invader');
            alien.anchor.setTo(0.5, 0.5);
            alien.animations.add('fly', [0, 1, 2, 3], 20, true);
            alien.play('fly');
            alien.body.moves = false;
        }
    }

    aliens.x = 100;
    aliens.y = 50;
}

function setupInvader(invader) {

    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');

}

function descend() {

    aliens.y += 10;

}

function update() {

    //  Scroll the background
    starfield.tilePosition.y += 2;

    distanciaBalaX = enemyBullets.children[0].x;
    distanciaBalaY = enemyBullets.children[0].y; 
    
    distanciaNaveX = player.position.x;

    diferenciaX = player.body.position.x - distanciaBalaX;


   /*  var numerador = player.position.y - enemyBullets.children[0].y; 
    var denominador = player.position.x - enemyBullets.children[0].x; 
    pendiente = numerador/denominador; */

    var posx=player.position.x-enemyBullets.children[0].x; 
    var posy=player.position.y-enemyBullets.children[0].y; 
    //distancia entre dos puntos pitagoras
    distanciaBala = Math.sqrt((posx*posx) + (posy*posy) );
    //dos decimales
    distanciaBala = distanciaBala.toFixed(2);

    var derecha = 0;
    var izquierda = 0;
    //var disparo = 0;
    //console.log(distanciaBalaY)


    if (player.alive) {
        
        player.body.velocity.setTo(0, 0);

        if (modoAuto == false) {
            if (cursors.left.isDown) {
                player.body.velocity.x = -400;
                izquierda = 1;
                derecha = 0;
                noMover = 0;
            }
            else if (cursors.right.isDown) {
                player.body.velocity.x = 400;
                derecha = 1;
                izquierda = 0;
                noMover = 0;
            }else{
                noMover = 1;
            }

            //  Firing?
            if (fireButton.isDown) {
                fireBullet();
                //disparo = 1;
            }
    
                    
            /* Se encarga las entradas y salidas */
            if(distanciaBalaY > 0){
                console.log("AQUII")
                datosEntrenamiento.push({
                    'input' :  [distanciaBalaY,distanciaBalaX,diferenciaX,distanciaNaveX ],
                    'output':  [derecha, izquierda, noMover]  
                });
            }
              
            

        }
        else{
            console.log("IA jugando")
            var cond = datosDeEntrenamiento( [distanciaBalaY,distanciaBalaX,diferenciaX,distanciaNaveX]);

            switch(cond){
                case 0:
                    console.log("se movio a la izquierda")
                    player.body.velocity.x = -400;
                    break;
                    case 1:
                        console.log("se movio a la derecha")
                        player.body.velocity.x = 400;
                        break;
                        case 2:
                            console.log("No se mueve")
                            player.body.velocity.setTo(0, 0);
                            break;
            }
            fireBullet();
        }
        if (game.time.now > firingTimer) {
            enemyFires();
        }



        //  Run collision
        game.physics.arcade.overlap(bullets, aliens, collisionHandler, null, this);
        game.physics.arcade.overlap(enemyBullets, player, enemyHitsPlayer, null, this);
    }

}

function render() {

    /*for (var i = 0; i < aliens.length; i++)
    {
        game.debug.body(aliens.children[i]);
    }

    for(var i = 0; i< enemyBullets.length; i++){
       game.debug.spriteInfo(enemyBullets.children[i], 32, 00);
       game.debug.body(enemyBullets.children[i]);
    }*/

}

function collisionHandler(bullet, alien) {

    //  When a bullet hits an alien we kill them both
    bullet.kill();
    alien.kill();

    //  Increase the score
    score += 20;
    scoreText.text = scoreString + score;

    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(alien.body.x, alien.body.y);
    explosion.play('kaboom', 30, false, true);

    if (aliens.countLiving() == 0) {
        score += 1000;
        scoreText.text = scoreString + score;

        enemyBullets.callAll('kill', this);
        stateText.text = " You Won, \n Click to restart";
        stateText.visible = true;

        //the "click to restart" handler
        game.input.onTap.addOnce(restart, this);
    }

}

function enemyHitsPlayer(player, bullet) {

    bullet.kill();

    live = lives.getFirstAlive();

    if (live) {
        live.kill();
    }

    //  And create an explosion :)
    var explosion = explosions.getFirstExists(false);
    explosion.reset(player.body.x, player.body.y);
    explosion.play('kaboom', 30, false, true);

    // When the player dies
    if (lives.countLiving() < 1) {
        player.kill();
        enemyBullets.callAll('kill');

        stateText.text = " GAME OVER";
        stateText.visible = true;

        pausa();
    }

}

function enemyFires() {

    //  Grab the first bullet we can from the pool
    enemyBullet = enemyBullets.getFirstExists(false);

    livingEnemies.length = 0;

    aliens.forEachAlive(function (alien) {

        // put every living enemy in an array
        livingEnemies.push(alien);
    });


    if (enemyBullet && livingEnemies.length > 0) {

        var random = game.rnd.integerInRange(0, livingEnemies.length - 1);

        // randomly select one of them
        var shooter = livingEnemies[random];
        // And fire the bullet from this enemy
        enemyBullet.reset(shooter.body.x, shooter.body.y);

        game.physics.arcade.moveToObject(enemyBullet, player, 200);
        firingTimer = game.time.now + 1350;
    }

}

function fireBullet() {

    //  To avoid them being allowed to fire too fast we set a time limit
    if (game.time.now > bulletTime) {
        //  Grab the first bullet we can from the pool
        bullet = bullets.getFirstExists(false);

        if (bullet) {
            //  And fire it
            bullet.reset(player.x, player.y + 8);
            bullet.body.velocity.y = -400;
            bulletTime = game.time.now + 200;
        }
    }

}

function resetBullet(bullet) {

    //  Called if the bullet goes out of the screen
    bullet.kill();

}

function restart() {

    //  A new level starts

    //resets the life count
    lives.callAll('revive');
    //  And brings the aliens back from the dead :)
    aliens.removeAll();
    createAliens();

    //revives the player
    player.revive();
    //hides the text
    stateText.visible = false;

}

/* ----- FUNCIÓN PAUSA ----- */
function pausa() {
    stateText.visible = false;
    game.paused = true;
    menu = game.add.sprite(w / 2, h / 2, 'menu');
    menu.anchor.setTo(0.5, 0.5);
}

function mPausa(event) {
    console.log("Pausa")
    if (game.paused) {
        var menu_x1 = w / 2 - 270 / 2, menu_x2 = w / 2 + 270 / 2,
            menu_y1 = h / 2 - 180 / 2, menu_y2 = h / 2 + 180 / 2;

        var mouse_x = event.x,
            mouse_y = event.y;

        if (mouse_x > menu_x1 && mouse_x < menu_x2 && mouse_y > menu_y1 && mouse_y < menu_y2) {
            if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 && mouse_y <= menu_y1 + 90) {
                eCompleto = false;
                datosEntrenamiento = [];
                modoAuto = false;
            } else if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 + 90 && mouse_y <= menu_y2) {
                if (!eCompleto) {
                    console.log("", "Entrenamiento " + datosEntrenamiento.length + " valores");
                    enRedNeural();
                    eCompleto = true;
                }
                modoAuto = true;
            }

            menu.destroy();
            resetVariables();
            game.paused = false;

        }
    }
}

/* ----- Restablecer posiciones de juego ----- */
function resetVariables() {
    player.position.x = 400;
    for (var i = 0; i < enemyBullets.length; i++) {
        enemyBullets.children[i].kill();
    }

    for (var i = 0; i < bullets.length; i++) {
        bullets.children[i].kill();
    }

    for (var i = 0; i < aliens.length; i++) {
        aliens.children[i].kill();
    }

    createAliens();
    lives.callAll('revive');
    player.revive();

}

/* ----- Entrenamiento de la red ----- */
function enRedNeural(){
    console.log("Se esta entrenando...")
    /* Aqui es donde se aprende */
    nnEntrenamiento.train(datosEntrenamiento, {rate: 0.0003, iterations: 10000, shuffle: true});
}
//rate -> taza de aprendizaje por cada iteracion aprende



function datosDeEntrenamiento(param_entrada){
    nnSalida = nnNetwork.activate(param_entrada);

    console.log("Entrada",param_entrada[0]+" "+param_entrada[1]+" "+param_entrada[2]+" "+param_entrada[3]);

   // console.log(nnSalida);
   var left = Math.round( nnSalida[0]*100 );
   var right = Math.round( nnSalida[1]*100 );
   var noMovement = Math.round( nnSalida[2]*100 );
   
   console.log("Valor ","IZQUIERDA %: "+ right + " DERECHA %: " + left + " QUIETO %: " + noMovement);
    
    if(left>right)
    {
        return 0;
    }else if (right > left)
    {
        return 1;
    }else{
        return 2
    }

}

