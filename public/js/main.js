// Sprites

//===================================
function Hero(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'hero');

  this.anchor.set(0.5, 0.5);
  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;

  this.animations.add('stop', [0]);
  this.animations.add('run', [1, 2], 8, true); // 8fps looped
  this.animations.add('jump', [3]);
  this.animations.add('fall', [4]);
}

Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype._getAnimationName = function () {
  // default hero stance
  let name = 'stop';
  // jumping animation
  if (this.body.velocity.y < 0) {
    name = 'jump';
  // falling animation
  } else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
    name = 'fall';
  // running animation
  } else if (this.body.velocity.x !== 0 && this.body.touching.down) {
    name = 'run';
  }
  return name;
};

// Use physics to move to allow game performance
Hero.prototype.move = function (direction) {
  const SPEED = 200;
  this.body.velocity.x = direction * SPEED;

  if (this.body.velocity.x < 0) {
    this.scale.x = -1;
  } else if (this.body.velocity.x > 0) {
    this.scale.x = 1;
  }
};

Hero.prototype.bounce = function () {
  // little bounce after hero lands on an enemy
  const BOUNCE_SPEED = 200;
  this.body.velocity.y = -BOUNCE_SPEED;
};

// Allow the hero to jump
Hero.prototype.jump = function () {
  const JUMP_SPEED = 600;
  let canJump = this.body.touching.down;
  if (canJump) {
    this.body.velocity.y = -JUMP_SPEED;
  }
  return canJump;
}

Hero.prototype.update = function () {
  let animationName = this._getAnimationName();
  if (this.animations.name !== this.animationName) {
    this.animations.play(animationName);
  }
}

//====================================

function Spider(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'spider');

  this.anchor.set(0.5);
  this.animations.add('crawl', [0, 1, 2], 8, true);
  this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12); // last two frames are for spider death animation
  this.animations.play('crawl');

  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;
  this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Spider.prototype.update = function () {
  // check against walls and reverse direction if necessary
  if (this.body.touching.right || this.body.blocked.right) {
      this.body.velocity.x = -Spider.SPEED; // turn left
  }
  else if (this.body.touching.left || this.body.blocked.left) {
      this.body.velocity.x = Spider.SPEED; // turn right
  }
};

Spider.prototype.die = function () {
  // after death, the animation is no longer considered part of collisions
  this.body.enable = false;

  this.animations.play('die').onComplete.addOnce(function () {
    this.kill();
  }, this);
};

//================================
// Game State

PlayState = {};

// How many levels
const LEVEL_COUNT = 2;

PlayState.init = function (data) {
  this.game.renderer.renderSession.roundPixels = true;
  this.keys = this.game.input.keyboard.addKeys({
    left: Phaser.KeyCode.LEFT,
    right: Phaser.KeyCode.RIGHT,
    up: Phaser.KeyCode.UP
  });
  this.keys.up.onDown.add(function () {
    let didJump = this.hero.jump();
    if (didJump) {
      this.sfx.jump.play();
    }
  }, this)
  // scoreboard counter
  this.coinPickupCount = 0;
  // default hero/key position
  this.hasKey = false;
  this.level = (data.level || 0) % LEVEL_COUNT;
};

PlayState.preload = function () {
  this.game.load.json('level:0', 'data/level00.json');

  this.game.load.json('level:1', 'data/level01.json');

  this.game.load.image('background', 'images/background.png');
  this.game.load.image('ground', 'images/ground.png');
  this.game.load.image('grass:8x1', 'images/grass_8x1.png');
  this.game.load.image('grass:6x1', 'images/grass_6x1.png');
  this.game.load.image('grass:4x1', 'images/grass_4x1.png');
  this.game.load.image('grass:2x1', 'images/grass_2x1.png');
  this.game.load.image('grass:1x1', 'images/grass_1x1.png');
  this.game.load.image('invisible-wall', 'images/invisible_wall.png');
  this.game.load.image('icon:coin', 'images/coin_icon.png'); // coin icon in corner
  this.game.load.image('font:numbers', 'images/numbers.png');
  this.game.load.image('key', 'images/key.png');

  this.game.load.audio('sfx:jump', 'audio/jump.wav');
  this.game.load.audio('sfx:coin', 'audio/coin.wav');
  this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
  this.game.load.audio('sfx:key', 'audio/key.wav');
  this.game.load.audio('sfx:door', 'audio/door.wav');

  this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
  this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
  this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
  this.game.load.spritesheet('door', 'images/door.png', 42, 66);
  this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);
};

PlayState.create = function () {
  // sound entities
  this.sfx = {
    jump: this.game.add.audio('sfx:jump'),
    coin: this.game.add.audio('sfx:coin'),
    stomp: this.game.add.audio('sfx:stomp'),
    key: this.game.add.audio('sfx:key'),
    door: this.game.add.audio('sfx:door')
  };

  this.game.add.image(0, 0, 'background');
  this._loadLevel(this.game.cache.getJSON('level:1'));
  // building a key to determine what the current level is
  this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));

  this._createHud();
};


PlayState.update = function() {
  this._handleCollisions();
  this._handleInput();
  this.coinFont.text = `x${this.coinPickupCount}`;
  this.keyIcon.frame = this.hasKey ? 1 : 0;
}

PlayState._handleCollisions = function () {
  // collision detection between spiders and platforms/invisible walls
  this.game.physics.arcade.collide(this.spiders, this.platforms);
  this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
  // collision detection between the hero and the platforms
  this.game.physics.arcade.collide(this.hero, this.platforms);
  // collision detection for hero and coins overlapping
  this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoins, null, this); // null, checks all coins 'no filter'
  // when spider touches hero something should get hurt
  this.game.physics.arcade.overlap(this.hero, this.spiders, this._onHeroVsEnemy, null, this);
  // collision detection when hero picks up the key
  this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey, null, this);
  // collision detection with hero and door. Ignore detection if hero doesn't have the key
  this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
    // ignore if hero doesn't have key
    function (hero, door) {
      return this.hasKey && hero.body.touching.down;
    }, this);
};

PlayState._onHeroVsDoor = function (hero, door) {
  this.sfx.door.play();
  this.game.state.restart();
  //
}

PlayState._onHeroVsKey = function (hero, key) {
  this.sfx.key.play();
  key.kill();
  this.hasKey = true;
};

PlayState._onHeroVsEnemy = function (hero, enemy) {
  // kills enemy if hero lands on it
  if (hero.body.velocity.y > 0) {
    enemy.die();
    // hero bounces
    hero.bounce();
    // plays the stomp when hero lands on a spider
    this.sfx.stomp.play();
  } else {
  // restart game if spider kills hero
  this.game.state.restart();
  }
};

PlayState._onHeroVsCoins = function (hero, coin) {
  // plays coin pick up sound when hero touches the coin
  this.sfx.coin.play();
  // call back when hero touches the coin, to show "the pick up of the coin"
  coin.kill();
  // increment counter for coins picked up
  this.coinPickupCount++;
}

PlayState._handleInput = function () {
// Make hero move left or right
  if(this.keys.left.isDown) {
    this.hero.move(-1);
  }
  else if(this.keys.right.isDown) {
    this.hero.move(1);
  }
  else { //stops the hero from moving other character moves indefinetly
    this.hero.move(0);
  }
};

// Loads the levels

PlayState._loadLevel = function (data) {
  // create background images group
  this.bgDecoration = this.game.add.group();
  // create platform groups
  this.platforms = this.game.add.group();
  // create coin groups
  this.coins = this.game.add.group();
  // create spider groups
  this.spiders = this.game.add.group();
  // create wall groups and hide them from the player
  this.enemyWalls = this.game.add.group();
  this.enemyWalls.visible = true;
  // spawn all platforms
  data.platforms.forEach(this._spawnPlatform, this);
  // spawn hero and enemies
  this._spawnCharacters({hero: data.hero, spiders: data.spiders});
  // create coins
  data.coins.forEach(this._spawnCoin, this);
  // spawn door
  this._spawnDoor(data.door.x, data.door.y);
  // spawn key
  this._spawnKey(data.key.x, data.key.y);
  // add gravity to game
  const GRAVITY = 1200;
  this.game.physics.arcade.gravity.y = GRAVITY;
};

PlayState._spawnDoor = function (x, y) {
  this.door = this.bgDecoration.create(x, y, 'door');
  this.door.anchor.setTo(0.5, 1);
  this.game.physics.enable(this.door); // physics enabled to have hero and door interactions
  this.door.body.allowGravity = false;
}

PlayState._spawnKey = function (x, y) {
  this.key = this.bgDecoration.create(x, y, 'key');
  this.key.anchor.setTo(0.5, 0.5);
  this.game.physics.enable(this.key);
  this.key.body.allowGravity = false;
  // adding an 'up & down' movement to the key
  this.key.y -= 3;
  this.game.add.tween(this.key)
    .to({y: this.key.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
    .yoyo(true)
    .loop()
    .start();
}

PlayState._spawnPlatform = function (platform) {
  // add platform to the group to enable physics/gravity
  let sprite = this.platforms.create(platform.x, platform.y, platform.image)
  this.game.physics.enable(sprite);
  // disable gravity for the platforms
  sprite.body.allowGravity = false;
  sprite.body.immovable = true;
  // add inivisible walls to the platforms
  this._spawnEnemyWall(platform.x, platform.y, 'left');
  this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function (x, y, side) {
  // create the invisible walls
  let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
  sprite.anchor.set(side === 'left' ? 1 : 0, 1);

  this.game.physics.enable(sprite);
  sprite.body.immovable = true;
  sprite.body.allowGravity = false;
}

PlayState._spawnCharacters = function (data) {
  // spawn the hero
  this.hero = new Hero(this.game, data.hero.x, data.hero.y);
  this.game.add.existing(this.hero);

  // spawn spiders
  data.spiders.forEach(function (spider) {
    let sprite = new Spider(this.game, spider.x, spider.y);
    this.spiders.add(sprite);
  }, this);
};

PlayState._spawnCoin = function (coin) {
  // spawn coins
  let sprite = this.coins.create(coin.x, coin.y, 'coin');
  sprite.anchor.set(0.5, 0.5);
  // animate the coins
  sprite.animations.add('rotate', [0, 1, 2, 1], 4, true); // 6fps looped
  sprite.animations.play('rotate');
  // apply physics to the coins
  this.game.physics.enable(sprite);
  sprite.body.allowGravity = false;
}

PlayState._createHud = function () {
  const NUMBERS_STR = '0123456789X ';
  this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
      NUMBERS_STR);

  this.keyIcon = this.game.make.image(0, 19, 'icon:key');
  this.keyIcon.anchor.set(0, 0.5);

  let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
  let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
      coinIcon.height / 2, this.coinFont);
  coinScoreImg.anchor.set(0, 0.5);

  this.hud = this.game.add.group();
  this.hud.add(coinIcon);
  this.hud.add(coinScoreImg);
  this.hud.add(this.keyIcon);
  this.hud.position.set(10, 10);
};

//entry point

window.onload = function () {
  let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
  game.state.add('play', PlayState);
  game.state.start('play');
  game.state.start('play', true, false, {level: 0});
};

