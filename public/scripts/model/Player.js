class Player extends LivingEntity {
  constructor(a) {
    super(a)
    this.id = 0

    this.name = a.name
    this.client = a.client

    this.size = 25
    this.storedAngle = a.angle

    this.message = ''
    this.storedMessage = ''

    this.messageTimeout

    this.position = a.position

    this.geometry = new THREE.BoxGeometry(1, 1, 1)
    this.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    this.cube = new THREE.Mesh(this.geometry, this.material)
    scene.add(this.cube)

    this.movingUp
    this.movingDown
    this.movingLeft
    this.movingRight
  }

  draw() {
    if (this.client) {
      this.angle = parseFloat(angleTowardsMouse().toFixed(2))
    }

    if (this.angle != this.storedAngle) {
      game.sendData = true
    }

    //this.drawRotatingElements()
    //this.drawNonRotatingElements()
  }

  updateMessage(message) {
    clearTimeout(this.messageTimeout)
    this.message = message
    this.messageTimeout = setTimeout(() => {
      this.clearMessage()
    }, 10 * 1000)
  }

  clearMessage() {
    this.message = ''
  }

  drawNonRotatingElements() {
    this.drawName()
    this.drawMessage()
  }

  drawName() {
    push()
    fill(0)
    text(this.name, this.x - textWidth(this.name) / 2, this.y - this.size / 2 - textDescent())
    pop()
  }

  drawMessage() {
    if (this.message == '') return
    push()
    fill(0, 200)
    const padding = 2
    noStroke()
    rect(this.x - textWidth(this.message) / 2 - padding, this.y - this.size / 1.5 - textAscent() * 2 + padding, textWidth(this.message) + padding * 2, textAscent(), 20)
    fill(255)
    text(this.message, this.x - textWidth(this.message) / 2, this.y - this.size / 1.5 - textAscent())
    stroke(0)
    pop()
  }

  /*drawRotatingElements () {
    push()
    translate(this.x, this.y)
    rotate(this.angle + PI + PI / 2)
    translate(-this.x, -this.y)

    ellipse(this.x, this.y, this.size, this.size)
    ellipse(this.x, this.y + this.size / 4, this.size / 4, this.size / 4)

    pop()
  }*/

  dispose(){
    this.cube.geometry.dispose()
    this.cube.material.dispose()
    scene.remove(this.cube)
  }

  move(direction, speed) {
    this.cube.translateOnAxis(direction, speed)
    this.position = this.cube.position
    // console.log(this.position)
  }

  updatePos(pos) {
    this.position = pos
    this.cube.position.set(pos.x, pos.y, pos.z)
  }

  static handleMovement(game) {
    if (!Chat.isChatFocused()) // Do not let player move if their typing a message.
      return
    if (game.player.movingUp) {
      game.player.move(new THREE.Vector3(0, 1, 0), 0.05)
      game.sendData = true
    }
    if (game.player.movingDown) {
      game.player.move(new THREE.Vector3(0, -1, 0), 0.05)
      game.sendData = true
    }
    if (game.player.movingRight) {
      game.player.move(new THREE.Vector3(1, 0, 0), 0.05)
      game.sendData = true
    }
    if (game.player.movingLeft) {
      game.player.move(new THREE.Vector3(-1, 0, 0), 0.05)
      game.sendData = true
    }

    game.socket.emit('player_transform', {
      position: game.player.position,
      angle: game.player.angle
    })
  }

  // handleMovement(){
  //   //if (
  //   this.cube.translateOnAxis(new THREE.Vector3(0, 1, 0), 0.1)
  // }

  /*handleMovement () {
    if (!Chat.isChatFocused()) // Do not let player move if their typing a message.
    { return }
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
      this.x -= 1
      game.sendData = true
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
      this.x += 1
      game.sendData = true
    }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
      this.y += 1
      game.sendData = true
    }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
      this.y -= 1
      game.sendData = true
    }
  }*/
}
