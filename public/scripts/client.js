const CAMERA_HEIGHT = 10
const ZOOM_HEIGHT_MAX = -3 // The smaller the value the 'higher' you can see..
const ZOOM_HEIGHT_MIN = 6 // The larger the value the 'closer' you can see..
const CUTSCENE_STARTING_HEIGHT = 50

var scene = new THREE.Scene()
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
var textlabels = []

var renderer = new THREE.WebGLRenderer(
  {
    antilias: true
  })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)


const game = new Game()

animate()

window.addEventListener('resize', onWindowResize, false)
window.addEventListener('keydown', onKeyDown)
window.addEventListener('keyup', onKeyUp)
window.addEventListener('wheel', onMouseScroll)

function onMouseScroll(e) {
  if (game.zoom <= ZOOM_HEIGHT_MIN && game.zoom >= ZOOM_HEIGHT_MAX) game.zoom -= e.deltaY / 250 / 1.5
  game.zoom = Math.min(game.zoom, ZOOM_HEIGHT_MIN)
  game.zoom = Math.max(game.zoom, ZOOM_HEIGHT_MAX)
}

function handleChat(key) {
  if (key == "Enter") {
    if (!Chat.isChatFocused() && !Chat.isInputEmpty()) {
      game.socket.emit('text', Chat.filterMessage(Chat.getInputText()))
      Chat.resetInput()
    }
    Chat.toggle()
  }
}

function onKeyDown(e) {
  if (game.playing) {
    handleChat(e.key)

    switch (e.key) {
      case "w":
        game.player.movingUp = true
        break
      case "a":
        game.player.movingLeft = true
        break
      case "s":
        game.player.movingDown = true
        break
      case "d":
        game.player.movingRight = true
        break
      default:
        break
    }
  }
}

function onKeyUp(e) {
  if (game.playing) {
    switch (e.key) {
      case "w":
        game.player.movingUp = false
        break
      case "a":
        game.player.movingLeft = false
        break
      case "s":
        game.player.movingDown = false
        break
      case "d":
        game.player.movingRight = false
        break
      default:
        break
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

function handleCamera() {
  // Lerp zoom changed by mouse wheel.
  game.currentZoom = THREE.Math.lerp(game.currentZoom, game.zoom, 0.02)

  // Lerp scene transition for a smooth effect.
  game.cutSceneDropValue = THREE.Math.lerp(game.cutSceneDropValue, CUTSCENE_STARTING_HEIGHT, 0.03)

  const z = CAMERA_HEIGHT - game.currentZoom + CUTSCENE_STARTING_HEIGHT - game.cutSceneDropValue
  camera.position.z = z;
  camera.position.x = game.player.position.x
  camera.position.y = game.player.position.y
}

function animate() {
  setupPlayer()

  if (game.playing) {
    handleCamera()
    Player.handleMovement(game)
  }

  requestAnimationFrame(animate);

  //cube.rotation.x += 0.01;
  //cube.rotation.y += 0.01;

  for (var i = 0; i < textlabels.length; i++) {
    // textlabels[i].updatePosition();
    // var box = new THREE.Box3().setFromObject( game.player.cube.scaling.y );
    // console.log( box.min, box.max );
    // console.log(game.player.cube.scale)
    textlabels[i].position.set(game.player.position.x + game.player.cube.scale.x/2, game.player.position.y + game.player.cube.scale.y/2, game.player.position.z)
  }

  renderer.render(scene, camera);
}

function _createTextLabel() {
  var div = document.createElement('div');
  div.className = 'text-label';
  div.style.position = 'absolute';
  div.style.width = 100;
  div.style.height = 100;
  div.innerHTML = "hi there!";
  div.style.top = -1000;
  div.style.left = -1000;

  var _this = this;

  return {
    element: div,
    parent: false,
    position: new THREE.Vector3(0, 0, 0),
    setHTML: function (html) {
      this.element.innerHTML = html;
    },
    setParent: function (threejsobj) {
      this.parent = threejsobj;
    },
    updatePosition: function () {
      if (parent) {
        this.position.copy(this.parent.position);
      }

      var coords2d = this.get2DCoords(this.position, _this.camera);
      this.element.style.left = coords2d.x + 'px';
      this.element.style.top = coords2d.y + 'px';
    },
    get2DCoords: function (position, camera) {
      var vector = position.project(camera);
      vector.x = (vector.x + 1) / 2 * window.innerWidth;
      vector.y = -(vector.y - 1) / 2 * window.innerHeight;
      return vector;
    }
  };
}


function setupPlayer() {
  if (game.creatingPlayer) {
    game.player = new Player({
      position: new THREE.Vector3(0, 0, 0),
      angle: 0,
      size: 25,
      health: 100,
      name: game.playerName,
      client: true
    })

    // var text = this._createTextLabel();
    // text.setHTML(game.player.name);
    // text.setParent(game.player);
    // text.element.style.color = "white"
    // this.textlabels.push(text);
    // document.body.appendChild(text.element);

    var spritey = makeTextSprite(game.player.name, { backgroundColor: { r: 255, g: 100, b: 100, a: 1 } });
    spritey.position = game.player.position
    scene.add(spritey);
    this.textlabels.push(spritey)

    const url = getURL() // This way we can dynamically switch between localhost and external ips.

    game.socket = io.connect(url, { // Make connection
      reconnect: false,
      autoconnect: false
    })

    game.socket.emit('new_player', {
      position: game.player.position,
      name: game.player.name
    })

    game.socket.on('connect', function () {
      console.log(game.socket.connected)
    })

    socketListener()

    game.creatingPlayer = false
    game.playing = true
  }
}

function socketListener() {
  game.socket.on('handshake', function (data) {
    Chat.logChatMessage(`Connected to ${getURL()}`, false)
    game.player.id = data
  })

  game.socket.on('players', function (data) {
    const entries = Object.entries(data)
    for (const [id, player] of entries) {
      if (game.player == null) continue
      if (id == game.player.id) continue
      game.players[id] = new Player(player)
      if (game.firstSetupDone)
        Chat.logChatMessage(`Player ${game.players[id].name} has connected`)
    }
    if (!game.firstSetupDone)
      game.firstSetupDone = true
  })

  game.socket.on('player_transforms', function (data) {
    // The server does not care if the client is not ready for player transforms update.
    // This is why we have to check if the length is 0 in case game.players is not ready.
    if (Object.keys(game.players).length == 0) return

    const entries = Object.entries(data)
    for (const [id, player] of entries) {
      if (game.player == null) continue
      if (id == game.player.id) continue
      let theplayer = game.players[id]
      theplayer.updatePos(player.position)
      theplayer.angle = player.angle
    }
  })

  game.socket.on('messages', function (data) {
    if (data.id == game.player.id) {
      Chat.logChatMessage(`${game.player.name}: ${data.text}`, true, true)
      game.player.updateMessage(data.text)
    } else {
      // Should we delete the player at game.players[data.id] here? Or just check if its not undefined??
      if (game.players[data.id] != undefined) {
        Chat.logChatMessage(`${game.players[data.id].name}: ${data.text}`)
        game.players[data.id].updateMessage(data.text)
      }
    }
  })

  game.socket.on('player_disconnected', function (id) {
    Chat.logChatMessage(`Player ${game.players[id].name} has disconnected`)
    game.players[id].dispose()
    delete (game.players[id])
  })

  game.socket.on('disconnect', (reason) => {
    // Server closed.
    console.log(reason)
    if (reason === 'transport close') {
      location.reload()
    }
  })
}


function makeTextSprite( message, parameters )
{
    if ( parameters === undefined ) parameters = {};
    var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
    var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
    var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
    var borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
    var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
    var textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:0, g:0, b:0, a:1.0 };

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = "Bold " + fontsize + "px " + fontface;
    var metrics = context.measureText( message );
    var textWidth = metrics.width;

    context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

    context.lineWidth = borderThickness;
    roundRect(context, borderThickness/2, borderThickness/2, (textWidth + borderThickness) * 1.1, fontsize * 1.4 + borderThickness, 8);

    context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
    context.fillText( message, borderThickness, fontsize + borderThickness);

    var texture = new THREE.Texture(canvas) 
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
    var sprite = new THREE.Sprite( spriteMaterial );
    sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 1);
    return sprite;  
}

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}