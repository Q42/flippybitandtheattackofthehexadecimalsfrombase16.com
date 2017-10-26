var screenWidth = 480,
    screenHeight = 806,
    tileSize = 60;

var Game = new (function() {
  var that = this,
      enemies = {},
      lastAttackValue = -1,
      tapToStart = false,
      cycleEnabled = false,
      timeBetweenEnemies,
      lastEnemyTime = 0,
      lastCycle = 0,
      attackValue = 0,
      score = 0,
      gameEnded = false,
      highScore = 0,
      nrsArr = [1,2,4,8,16,32,64,128],
      nrToI = {1:1,2:2,4:3,8:4,16:5,32:6,64:7,128:8},
      tohs = {},
      scale,
      scaleBorder = false,
      gameWidth,
      drawingFrame = false;
      singlePadding = 0,
      now = 0,
      curNr = -1,
      whut = 'atobias',
      keyRanges = ['12345678','qwertyui','asdfghjk','zxcvbnm,'];


  $(init);

  function init() {
    //$(document).on('touchmove', function(e){Utils.eat(e);return false;})
    highScore = $bw.storage.get('HIGHSCORE') * 1;
    if (isNaN(highScore))
      highScore = 0;
    window.onresize = resize;
    resize();
    Sound.init();
    $game = $('#game');
    makeNumbersTappable();
    $(document).on(Utils.touchStart(), '#game-container', tappedToStart);
    setTimeout(startLogo, 100);
  }

  function startLogo() {
    $('#logo').hide();
    $('html').addClass('logo');
    $('#guy').addClass('at-computer');
    setTimeout(function(){
      $('#guy').addClass('walk');
    }, 100);
    setTimeout(function(){
      $('#guy').removeClass('walk');
    }, 1400);
    setTimeout(addNumbersToDock, 1600);
    setTimeout(function(){
      updateAttackValue();
      Sound.play('8bit');
      Sound.play('explo');
      $('#logo').show();
      $bw.effects.shake();
      $('#guy').addClass('fast');
    }, 3500);
    tohs.tts = setTimeout(function(){
      tapToStart = true;
    }, 5000);
    if (Config.tapToPlayImmediately) {
      clearTimeout(tohs.tts);
      tapToStart = true;
    }
    if (document.location.hash.indexOf(window[whut.substr(0,4)]('YXByaWwx'))!=-1) {
      scaleBorder = true;
    }
  }

  function tappedToStart(event) {
    if (tapToStart) {
      tapToStart = false;
      $('html').addClass('starting-game');
      setTimeout(startGame, 1000);
      return false;
    }
  }

  function cleanGame() {
    attackValue = 0;
    Enemy.speed = Config.enemySpeed;
    timeBetweenEnemies = Config.timeBetweenEnemies;
    for (var id in enemies) {
      var enemy = enemies[id];
      enemy.destroy();
      delete enemies[id];
    }
    $(nrsArr).each(function(i){
      var nr = nrsArr[i];
      var x = tileSize * i;
      var $nr = $('#dock .number[data-nr="' + nr + '"]'),
          $missile = $('#missile-' + nr);
      $nr.removeClass('selected').html('0');
      $missile.removeClass('selected hover');
    });
    updateAttackValue();
  }

  function startGame() {
    $('html').removeClass('logo starting-game game-over').addClass('game-started');
    score = 0;
    updateScore();
    cleanGame();
    addEnemy();
    cycleEnabled = true;
    gameEnded = false;
    cycle();
  }

  function gameOver() {
    gameEnded = true;
    if (score > highScore) {
      highScore = score;
      $bw.storage.set('HIGHSCORE', highScore);
    }
    $bw.effects.shake();
    Sound.play('gameover');
    cycleEnabled = false;
    $('html').removeClass('game-started').addClass('game-over');
    cleanGame();
    setTimeout(function(){
      tapToStart = true;
    }, 1500);
  }

  function drawFrame() {
    now = new Date() * 1;
    for (var id in enemies) {
      var enemy = enemies[id];
      enemy.update();
    }
    drawingFrame = false;
  }

  function cycle() {
    // see if we need to add a new enemy
    if (now > lastEnemyTime + timeBetweenEnemies)
      addEnemy();

    timeBetweenEnemies -= 0.2;
    var lockedOnTarget = false;
    for (var id in enemies) {
      var enemy = enemies[id];
      enemy.cycle();

      if (!enemy.underAttack && attackValue == enemy.value && !lockedOnTarget) {
        attack(enemy);
        lockedOnTarget = true;
      }

      if (enemy.reachedBottom()) {
        enemy.destroy();
        delete enemies[id];
        enemyRemoved();
        gameOver();
      }
    }

    if (!drawingFrame)
      requestAnimFrame(drawFrame);

    if (cycleEnabled)
      setTimeout(cycle, Config.cycleInterval);
  }

  function addEnemy() {
    var enemy = new Enemy();
    enemies[enemy.id] = enemy;
    lastEnemyTime = new Date() * 1;
  }

  function enemyRemoved() {
  }

  function addNumbersToDock() {
    $(nrsArr).each(function(i){
      var nr = nrsArr[i];
      var x = screenWidth - tileSize * (i + 1);
      setTimeout(function(){
        var $nr = $('<div class="number" data-nr="' + nr + '">' + 0 + '</div>');
        $('#dock').append($nr);
        $nr.css({'left': x + 'px', 'z-index': 16 - i}).attr('data-left', x);
        Sound.play('flip' + (i+1));
      }, i * 200);

      var $tapper = $('<div class="tapper" data-nr="' + nr + '"></div>');
      $('#game').append($tapper);
      $tapper.css('left', x + 'px');
      addMissile(i);
    });
  }

  function addMissile(index) {
      var nr = nrsArr[index];
      var $missile = $('<div data-index="' + index + '" id="missile-' + nr + '" class="missile in-dock"></div>');
      $('#game').append($missile);
      var x = screenWidth - tileSize * (index + 1);
      $missile.css({'left': x + 'px'});
  }

  function resize() {
    var maxWidth = $('body').width(),
        maxHeight = $('body').height() * 0.9,
        scaleX = maxWidth / screenWidth,
        scaleY = maxHeight / screenHeight;
    
    scale = Math.min(scaleX, scaleY);
    var deviceWidth = $('html').width();
    
    gameWidth = $('#game').width() * scale;
    singlePadding = (gameWidth < deviceWidth)? Math.round((deviceWidth - gameWidth) / 2) : 0;
    
    Utils.cssVendor($('#game-container'), 'transform', 'scale3d(' + scale + ',' + scale + ',' + scale + ')');
  }

  function makeNumbersTappable() {
    var down = false,
        keyToNr = {};

    // prepare a keymap
    for (var i=0; i<keyRanges.length; i++) {
      for (var j=0; j<keyRanges[i].length; j++) {
        var ch = keyRanges[i].substr(j,1);
        keyToNr[ch] = nrsArr[7-j];
      }
    }

    $(document).on('keypress', 'html', keyPress);
    $(document).on(Utils.touchStart(), 'html.game-started .tapper', touchStart);
    $(document).on(Utils.touchMove(), 'html.game-started .tapper', touchMove);
    $(document).on(Utils.touchEnd(), 'html', touchEnd);

    function keyPress(event) {
      var key = String.fromCharCode(event.keyCode || event.charCode).toLowerCase(),
          nr = keyToNr[key] * 1;
      if (!tapToStart && nr > 0) {
        if (scaleBorder)
          return scaleBorderFrame();
        toggleNr(nr);
      }
      else if (tapToStart) {
        if (nr > 1 || event.keyCode == 32 || event.keyCode == 27 || event.keyCode == 13)
          return tappedToStart(event);
      }
    }

    function touchStart(event) {
      if (scaleBorder)
        return scaleBorderFrame();

      var $tapper = $(event.target).closest('.tapper'),
          nr = $tapper.attr('data-nr');
      curNr = -1;
      toggleNr(nr);
      down = true;
      return false;
    }

    function touchMove(event) {
      Utils.eat(event);
      if (!down) return false;
      if (scaleBorder) return false;

      /*
      var xyEvent = event;
      if (event.originalEvent && event.originalEvent.touches)
        xyEvent = event.originalEvent.touches[0];

      var x = xyEvent.clientX;
      if (x < singlePadding || x > gameWidth + singlePadding)
        return false;
      
      var index = 7 - Math.floor(((x - singlePadding) / gameWidth) * 8),
          nr = Math.pow(2, index);
          */

      var nr = $(event.target).closest('.tapper').attr('data-nr') * 1;
      if (curNr == nr) return;

      toggleNr(nr);
      return false;
    }

    function touchEnd(event) {
      down = false;
    }
  }

  function toggleNr(nr, forceTrue) {
    nr = nr * 1;
    curNr = nr;
    var i = nrToI[nr];
    Sound.play('flip' + i);
    var $nr = $('#dock .number[data-nr="' + nr + '"]'),
        $missile = $('#missile-' + nr);

    if (!$nr.hasClass('selected') || forceTrue) {
      attackValue += nr;
      $nr.addClass('selected').html('1');
      $missile.addClass('selected hover');
    }
    else {
      attackValue -= nr;
      $nr.removeClass('selected').html('0');
      $missile.removeClass('selected hover');
    }

    updateAttackValue(attackValue);
  }

  function attack(enemy) {
    Enemy.speed += 0.01;
    timeBetweenEnemies -= 30;

    enemy.attack();
    attackValue = 0;
    $('#dock .number.selected').each(function(missileIndex) {
      var $nr = $(this),
          nr = $nr.attr('data-nr') * 1,
          left = $nr.attr('data-left') * 1;
      
      // add missiles
      var $missile = $('#missile-' + nr),
          index = $missile.attr('data-index') * 1;
      $missile.attr('id', '').removeClass('hover').addClass('firing');
      $missile.animate({'left': enemy.x + 22, 'bottom': 168}, 1000, function() {
        if (missileIndex == 0) {
          firemissile($(this));
        } else
          $(this).remove();
      });
      addMissile(index);
      
      // reload
      $nr.removeClass('selected').html('0');
      setTimeout(function() {
        $nr.removeClass('reload');
      }, 0);
    });

    function firemissile($missile) {
      updateAttackValue(attackValue);
      Sound.play('launch');
      var distance = Config.ground - enemy.y - Config.enemyHeight - Config.cycleInterval * enemy.speed;
      Utils.cssVendor($missile, 'transform', 'translate3d(0, ' + -distance + 'px, 0)');
      setTimeout(function(){
        if (!gameEnded) {
          enemy.stop();
          enemyRemoved();
          enemy.explode();
          $bw.effects.shake();
          score++;
          updateScore();
          Sound.play('explo');
        }
        $missile.remove();
      }, Config.missileDuration);
    }
  }

  function enemyCount() {
    return $('.enemy').not('.under-attack').length;
  }

  function updateAttackValue(value) {
    if (!value) value = 0;
    if (value == lastAttackValue) return;
    lastAttackValue = value * 1;
    $('#attackValue').html(Utils.intToBase(value, Config.base));
  }

  function updateScore() {
    value = score;// || '';
    $('#score').html(value);

    if (highScore > 0)
      $('#highscore').html('HIGHSCORE ' + highScore).show();
    else
      $('#highscore').hide();
  }

  function loadNewEnemy(nr) {
    var remain = nr,
        derp = {};
    for (var i=0; i<8; i++) {
      var val = Math.pow(2, 7-i);
      if (remain >= val) {
        remain -= val;
        derp[val] = true;
      }
    }
    return derp;
  }

  function scaleBorderFrame() {
    var enemy = null;
    for (var id in enemies) {
      if (!enemies[id].underAttack) {
        enemy = enemies[id];
        break;
      }
    }
    if (!enemy) return;
    var target = enemy.value,
        derp = loadNewEnemy(target),
        arr = [0,1,2,3,4,5,6,7];

    // todo, pick random from this list...
    for (var i=0; i<8; i++) {
      var index = Utils.draw(arr),
          val = Math.pow(2, 7-index),
          shouldBeSelected = derp[val] == true,
          isSelected = $('#dock .number[data-nr="' + val + '"].selected').length > 0;
      // disable missiles that shouldn't be active, and enable the ones that should...
      if ((shouldBeSelected && !isSelected) || !shouldBeSelected && isSelected) {
        toggleNr(val);
        return;
      }
    }
  }
})();