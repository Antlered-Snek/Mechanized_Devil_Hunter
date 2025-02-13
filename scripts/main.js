



// Essentials
let canvas = document.getElementById('combat');
let c = canvas.getContext("2d");
        
canvas_width = window.innerWidth;
canvas_height = window.innerHeight + 200;
canvas.width = canvas_width;
canvas.height = canvas_height;

let ui = document.getElementById('ui');
let u = ui.getContext("2d");

ui.width = canvas_width;
ui.height = canvas_height;





// Global Variables
const g = 10;
const drag = 10;
const maxSpeed = 50;
let translated = {x: 0, y: 0};
let eventIndex;
let changeEvent = 0;
let spawnCap = {l:0, g:0};
let freezeFrames = 0;
let isShaking = false;
let isShaking_strength = 0;
let isShaking_duration = 0;
let supremeIndex = 0;


let keys = {
	// Movement
	w: {pressed: false},
	a: {pressed: false},
	s: {pressed: false},
	d: {pressed: false},

	// Attacks
	mouseL: {pressed: false},
	mouseR: {pressed: false},
	mouseM: {pressed: false},
	mouseB: {pressed: false},
	mouseF: {pressed: false},
	space: {pressed: false},

	// Features
	shiftL: {pressed: false}
}

	// Object Containers
let enemies = {obj: [], l: 0, g: 0, s: []};
let projectiles = {obj: []};
let effects = {obj: []};

















// Global Images
const reticle = new Image();
reticle.src = 'images/reticle.png';











// Global Audio
const machineGun_sfx = new Audio('audio/machineGun_shot.mp3');
const playerDamaged_sfx = new Audio('audio/playerDamaged.mp3');

const playerDeath = new Audio('audio/playerDeath.mp3');









































// Classes
class Effect {
	constructor(position, size, {action, color, sprite=null}) {
		this.position = position;
		this.velocity = {x:0, y:0};
		this.acceleration = {x:0, y:0};
		this.color = color;
		this.sprite;
		this.action = action;
		this.size = size;
		this.isDestroyed = false;

		if (sprite != null) {
			this.sprite = {
				img: sprite.img,
				spriteSheet: sprite.spriteSheet,
				fps: {
					cd: 0,
					max: 60 / sprite.fps
				},
				size: sprite.size,
				table: {
					rows: sprite.table.rows,
					cols: sprite.table.cols,
					totalFrames: sprite.table.totalFrames,

					currentRow: 1,
					currentCol: 1
				}
			}
		}
		else this.sprite = null;

		effects.obj.push(this);
	}
	// sprite: {
	// 	img: null,
	// 	spriteSheet: new Image(),
	// 	fps: 60,
	// 	size: {
	// 		width: 500,
	// 		height: 374
	// 	},
	// 	table: {
	// 		rows: 1,
	// 		cols: 26,
	// 		totalFrames: 26,

	// 		currentRow: 0,
	// 		currentCol: 0
	// 	}
	// }

	draw() {
		if (this.sprite != null) {
			if (this.sprite.img != null) {
				c.save();
				c.translate(this.position.x, this.position.y);
				c.rotate(this.position.rotation * Math.PI / 180);
				c.drawImage(this.sprite.img, 0, 0, this.sprite.size.width, this.sprite.size.height, -this.size.width*0.5, -this.size.height*0.5, this.size.width, this.size.height);
				c.restore();
			}
			else {
				let startX = (this.sprite.table.currentCol-1) * this.sprite.size.width;
				let startY = (this.sprite.table.currentRow-1) * this.sprite.size.height;

				c.save();
				c.beginPath();
				c.translate(this.position.x, this.position.y);
				c.rotate(this.position.rotation * Math.PI / 180);
				if (this.size.radius != 0) {
					c.arc(0, 0, this.size.radius, 0, Math.PI*2);
					c.clip();
				}
				c.drawImage(this.sprite.spriteSheet, startX, startY, this.sprite.size.width, this.sprite.size.height, -this.size.width*0.5, -this.size.height*0.5, this.size.width, this.size.height);
				c.closePath();
				c.restore();

				// FPS
				if (!this.sprite.fps.cd) {
					this.sprite.fps.cd = this.sprite.fps.max;

					// Change Column
					this.sprite.table.currentCol++;

					// Change Row
					if (this.sprite.table.currentCol > this.sprite.table.cols) {
						this.sprite.table.currentCol = 1;
						this.sprite.table.currentRow++;
					}

					// End of SpriteSheet
					if ( (this.sprite.table.currentRow-1) * this.sprite.table.cols + this.sprite.table.currentCol >= this.sprite.table.totalFrames ) {
						this.sprite.table.currentRow = 1;
						this.sprite.table.currentCol = 1;
					}

				}
				else this.sprite.fps.cd--;
			}
			return;
		}

		if (typeof(this.color) === 'string') c.fillStyle = this.color;
		else c.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;

		if (this.size.radius == 0) {
			c.save();
			c.translate(this.position.x, this.position.y);
			c.rotate(this.position.rotation * Math.PI / 180);
			c.fillRect(-this.size.width*0.5, -this.size.height*0.5, this.size.width, this.size.height);
			c.restore();
		}
		else {
			c.beginPath();
			c.arc(this.position.x, this.position.y, this.size.radius, 0, 2*Math.PI);
			c.fill();
			c.closePath();
		}
	}

	vectors() {
		this.velocity.x += this.acceleration.x * 0.01;
		this.velocity.y += this.acceleration.y * 0.01;

		this.position.x += this.velocity.x;
		this.position.y += this.velocity.y;
	}

	autoDelete() {
		if (getDistance(this, player) > canvas_width*3) this.isDestroyed = true;
		if (this.isDestroyed) {
			for (let i in effects.obj) {
				if (effects.obj[i] === this) effects.obj.splice(i, 1);
			}
		}
	}

	update() {
		this.action(this);
		this.vectors();
		this.autoDelete();
		this.draw();
	}
}














class Player {
	constructor({size, stats, weapons, color}) {
		this.size = size;
		this.position = {x: canvas_width*0.5, y: canvas_height*0.5, rotation: 0};
		this.velocity = {x: 0, y: 0};
		this.acceleration = {x: 0, y: 0};

		// Stats
		this.health = stats.health;
		this.stability = stats.health * 0.2;
		this.regen = stats.regen;
		this.walkSpeed = stats.walkSpeed;
		this.dashSpeed = stats.dashSpeed;
		this.damageMultiplier = 1;
		this.damageTakenMultipler = 1;
		this.drag = drag;

		// States
		this.canMove = true;
		this.isMoving = false;
		this.isDashing = false;
		this.isInvincible = false;
		this.isStable = true;
		this.lastKey = {
			x: 'a',
			y: 'w'
		}

		// Weapons
		this.weapons = weapons;

		// Sprite Info
		this.color = color;

		// Miscellaneous
		this.maxHealth = this.health;
		this.maxStability = this.stability;
		this.score = 0;
		this.storedScore = 0;
		this.scoreDisplay = 0;
		this.displayInterval = 40;
		this.displayTime = 0;
		this.displayShow = true;
		this.trailCD = 3;

		// Death
		this.isDestroyed = false;
		this.destructionCountdown = 300;
	}

	draw() {
		c.fillStyle = this.color;
		
		c.save();
		c.translate(this.position.x, this.position.y);
		c.rotate(this.position.rotation * Math.PI / 180);
		c.fillRect(-this.size.width*0.5, -this.size.height*0.5, this.size.width, this.size.height);
		c.restore();
	}

	move() {
		if (!this.canMove) return;
		this.isMoving = true;
		let rot = getPlayerDirection();

		this.velocity.x = this.walkSpeed * Math.cos(rot * Math.PI/180);
		this.velocity.y = this.walkSpeed * Math.sin(rot * Math.PI/180);
	}

	dash() {
		if (this.isDashing || !this.canMove) return;
		this.isDashing = true;
		this.isMoving = false;
		this.isInvincible = true;

		let rot = getPlayerDirection();
		if (rot == null) rot = this.position.rotation;

		this.velocity.x = this.dashSpeed * Math.cos(rot * Math.PI/180);
		this.velocity.y = this.dashSpeed * Math.sin(rot * Math.PI/180);;

		setTimeout( () => {
			this.isDashing = false;
			setTimeout( () => {
				clearInterval(blur);
				this.isInvincible = false;
			}, 150)
		}, 300)

		// After Images
		let blur = setInterval( () => {
			let pos = {
				x: this.position.x,
				y: this.position.y,
				rotation: this.position.rotation,
			}
			let s = {
				width: this.size.width,
				height: this.size.height,
				radius: 0
			}
			afterImage.color = {
				r: 0,
				g: 200,
				b: 200,
				a: 1
			}
			let shadow = new Effect(pos, s, afterImage);
		}, 10)
	}

	vectors() {
		// Tranlation
		c.translate(-this.velocity.x, -this.velocity.y);
		translated.x -= this.velocity.x;
		translated.y -= this.velocity.y;

		// Position, Velocity, Acceleration
		this.position.x += this.velocity.x;
		this.position.y += this.velocity.y;
		this.velocity.x += this.acceleration.x * 0.01;
		this.velocity.y += this.acceleration.y * 0.01;

		// Velocity Cap
		if ( Math.abs(Math.hypot(this.velocity.x, this.velocity.y)) > maxSpeed ) {
			let rot = Math.atan2(this.velocity.y, this.velocity.x);
			
			this.velocity.x = maxSpeed * Math.cos(rot);
			this.velocity.y = maxSpeed * Math.sin(rot);
		}

		// Drag
			// Velocity
		if (!this.isMoving || !this.isDashing) {
			if (this.velocity.x != 0) {
				if (Math.abs(this.velocity.x) > 0.1) this.velocity.x *= this.drag*0.09;
				else this.velocity.x = 0;
			}
			if (this.velocity.y != 0) {
				if (Math.abs(this.velocity.y) > 0.1) this.velocity.y *= this.drag*0.09;
				else this.velocity.y = 0;
			}

			// Acceleration
			if (this.acceleration.x != 0) {
				if (Math.abs(this.acceleration.x) > 0.1) this.acceleration.x *= this.drag*0.09;
				else this.acceleration.x = 0;
			}
			if (this.acceleration.y != 0) {
				if (Math.abs(this.acceleration.y) > 0.1) this.acceleration.y *= this.drag*0.09;
				else this.acceleration.y = 0;
			}
		}
	}

	tookDamage(damage, damageMultiplier, angle) {
		if (this.isDestroyed) return
		if (this.isStable) {
			this.stability -= damage * damageMultiplier * this.damageTakenMultipler;
			this.health -= damage * damageMultiplier * this.damageTakenMultipler * 0.1;
		}
		else this.health -= damage * damageMultiplier * this.damageTakenMultipler;

		this.damageAnimation(angle);

			// Audio
		if (playerDamaged_sfx.currentTime > 0.2) playerDamaged_sfx.currentTime = 0;
		playerDamaged_sfx.play();
	}

	damageAnimation(angle, isSparking=true) {
		// Spark Effects
		if (isSparking) {
			let squirt = setInterval( () => {
				let randS = Math.floor(Math.random()*9) + 1;
				let angle2 = angle + Math.floor(Math.random()*80) - 40;;
				let splatterStrength = Math.floor(Math.random()*30);

				let pos = {
					x: this.position.x,
					y: this.position.y,
					rotation: 0,
				}
				let s = {
					width: randS,
					height: randS,
					radius: 0
				}
				let shadow = new Effect(pos, s, sparks);

				
				shadow.velocity.x = splatterStrength * Math.cos(angle2 * Math.PI/180);
				shadow.velocity.y = splatterStrength * Math.sin(angle2 * Math.PI/180);
			}, 20)
			setTimeout( () => {
				clearInterval(squirt);
			}, 100)
		}


		// Explosion Effects
		if ((!this.isStable && this.health > 0) || !isSparking) {
			let randS = Math.floor(Math.random()*19) + 1;

			let pos = {
				x: this.position.x + Math.floor(Math.random()*this.size.width*2) - this.size.width,
				y: this.position.y + Math.floor(Math.random()*this.size.height*2) - this.size.height,
				rotation: 0,
			}
			let s = {
				width: 0,
				height: 0,
				radius: randS
			}
			let shadow = new Effect(pos, s, explosion);
			screenShake();
		}
	}

	statesHandling() {
		// General
		this.canMove = true;

		// Dashing
		if (this.isDashing) {
			this.canMove = false;
		}

		// Health
		if (this.stability < this.maxStability) this.stability += this.regen;
		else if (this.stability > this.maxStability) this.stability = this.maxStability;

		if (this.stability <= 0) {
			this.stability = 0;
			this.isStable = false;
		}
		else if (this.stability >= this.maxStability*0.5 && !this.isStable) this.isStable = true;

		// Death
		if (this.health <= 0) {
			self.acceleration = {x:0, y:0};
			if (this.destructionCountdown > 0) {
				this.destructionCountdown--;
				this.canMove = false;
				this.isMoving = false;
				this.isStable = false;
				this.drag = 11;

				this.damageAnimation(0, false)
			}
			else {
				this.isDestroyed = true;
				this.velocity = {
					x: 0,
					y: 0
				}
				this.acceleration = {
					x: 0,
					y: 0
				}


				// Explosion Effects
				let pos = {
					x: this.position.x,
					y: this.position.y,
					rotation: 0,
				}
				let s = {
					width: 0,
					height: 0,
					radius: 250
				}
				let shadow = new Effect(pos, s, explosion);
				screenShake(80, 50);

				// Audio
				let sfx = new Audio('audio/explosion_sfx.mp3');
				sfx.play();
				
			}
		}
	}

	trailEffect() {
		if (this.trailCD <= 0) {
			let pos = {
				x: this.position.x,
				y: this.position.y,
				rotation: 0
			}
			let s = {
				width: 0,
				height: 0,
				radius: this.size.width*0.4
			}

			let effect = new Effect(pos, s, trail);
			trail.color = {
				r: 255,
				g: 255,
				b: 255,
				a: 1
			}
			this.trailCD = 3;
		}
		else this.trailCD--;
	}

	attack(index) {
		if (this.isDestroyed) return;
		if (this.weapons[index].stats.cooldown == 0) this.weapons[index].action(this.weapons[index]);
	}

	weaponCD() {
		for (let i in this.weapons) {
			if (this.weapons[i].stats.cooldown > 0) this.weapons[i].stats.cooldown--;
		}
	}

	update() {
		if (this.isDestroyed) return
		this.trailEffect();
		this.weaponCD();
		this.statesHandling();
		this.vectors();
		this.draw();
	}
}














class Minion {
	constructor(position, {size, rank, genStats, stats=null, behavior, attacks, death, color}) {
		this.position = position;
		this.size = size;
		this.velocity = {x: 0, y: 0};
		this.acceleration = {x: 0, y: 0};
		this.rank = rank

		// General Stats
		this.health = genStats.health;
		this.walkSpeed = genStats.walkSpeed;
		this.fireRate = genStats.fireRate;
		this.cooldown = genStats.cooldown;
		this.score = genStats.score;
		this.extra = genStats.extra;

		// Stats
		if (stats != null) this.stats = stats;

		// Other Stats
		this.damageMultiplier = 1;
		this.damageTakenMultipler = 1;
		this.drag = drag;

		// Miscellaneous States
		this.canMove = true;
		this.isMoving = false;
		this.isDestroyed = false;

		// Behavior
		this.behavior = behavior;
		this.attacks = attacks;
		this.death = death;

		// Sprite Info
		this.color = color;
		enemies.obj.push(this);

		if (this.rank == 'Lesser') enemies.l++;
		else if (this.rank == 'Greater') enemies.g++;
	}

	draw() {
		c.fillStyle = this.color;
		
		if (this.size.radius == 0) {
			c.save();
			c.translate(this.position.x, this.position.y);
			c.rotate(this.position.rotation * Math.PI / 180);
			c.fillRect(-this.size.width*0.5, -this.size.height*0.5, this.size.width, this.size.height);
			c.restore();
		}
		else {
			c.beginPath();
			c.arc(this.position.x, this.position.y, this.size.radius, 0, 2*Math.PI);
			c.fill();
			c.closePath();
		}
	}

	vectors() {
		this.velocity.x += this.acceleration.x * 0.01;
		this.velocity.y += this.acceleration.y * 0.01;

		this.position.x += this.velocity.x;
		this.position.y += this.velocity.y;

		// Drag
			// Velocity
		if (!this.isMoving) {
			if (this.velocity.x != 0) {
				if (Math.abs(this.velocity.x) > 0.1) this.velocity.x *= this.drag*0.09;
				else this.velocity.x = 0;
			}
			if (this.velocity.y != 0) {
				if (Math.abs(this.velocity.y) > 0.1) this.velocity.y *= this.drag*0.09;
				else this.velocity.y = 0;
			}
		}
			// Acceleration
		if (this.acceleration.x != 0) {
			if (Math.abs(this.acceleration.x) > 0.1) this.acceleration.x *= this.drag*0.09;
			else this.acceleration.x = 0;
		}
		if (this.acceleration.y != 0) {
			if (Math.abs(this.acceleration.y) > 0.1) this.acceleration.y *= this.drag*0.09;
			else this.acceleration.y = 0;
		}
	}

	tookDamage(damage, damageMultiplier, angle) {
		this.health -= damage * damageMultiplier * this.damageTakenMultipler;

		// Blood Effects
		let squirt = setInterval( () => {
			let randS = Math.floor(Math.random()*9) + 1;
			let angle2 = angle + Math.floor(Math.random()*80) - 40;
			let splatterStrength = Math.floor(Math.random()*30);

			let pos = {
				x: this.position.x,
				y: this.position.y,
				rotation: 0,
			}
			let s = {
				width: randS,
				height: randS,
				radius: 0
			}
			let shadow = new Effect(pos, s, blood);
			
			shadow.velocity.x = splatterStrength * Math.cos(angle2 * Math.PI/180);
			shadow.velocity.y = splatterStrength * Math.sin(angle2 * Math.PI/180);
		}, 5)
		setTimeout( () => {
			clearInterval(squirt);
		}, 100)
	}

	autoDelete() {
		if (getDistance(this, player) > canvas_width*3) this.isDestroyed = true;
		if (this.health <= 0) {
			this.isDestroyed = true;

			// Score
			player.storedScore += this.score;


			// Blood Effects
			if (this.rank != 'None') {
				for (let i=0; i<=360; i+=4) {
					let randS = Math.floor(Math.random()*9) + 1;
					let angle = Math.floor(Math.random()*360);
					let splatterStrength = Math.floor(Math.random()*20);

					let pos = {
						x: this.position.x,
						y: this.position.y,
						rotation: 0,
					}
					let s = {
						width: randS,
						height: randS,
						radius: 0
					}
					let shadow = new Effect(pos, s, blood);
					
					shadow.velocity.x = splatterStrength * Math.cos(angle * Math.PI/180);
					shadow.velocity.y = splatterStrength * Math.sin(angle * Math.PI/180);
				}

				// Audio
				// let audio = new Audio('audio/minion_death.mp3');
				// audio.play();
			}
		}


		if (this.isDestroyed) {
			for (let i in enemies.obj) {
				if (enemies.obj[i] === this) enemies.obj.splice(i, 1);
			}
			this.death(this);

			if (this.rank == 'Lesser') enemies.l--;
			else if (this.rank == 'Greater') enemies.g--;
		}

		if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.rotation)) {
			alert(`${this.position.x}, ${this.position.y}, ${this.position.rotation}`)
		}
	}

	update() {
		this.behavior(this);
		this.vectors();
		this.autoDelete();
		this.draw();
	}
}
















class Boss {
	constructor(position, {name, size, genStats, stats=null, behavior, attacks, death, event, color}) {
		this.position = position;
		this.size = size;
		this.velocity = {x: 0, y: 0};
		this.acceleration = {x: 0, y: 0};

		// General Stats
		this.name = name;
		this.health = genStats.health;
		this.walkSpeed = genStats.walkSpeed;
		this.fireRate = genStats.fireRate;
		this.cooldown = genStats.cooldown;
		this.score = genStats.score;
		this.extra = genStats.extra;

		// Stats
		if (stats != null) this.stats = stats;

		// Other Stats
		this.damageMultiplier = 1;
		this.damageTakenMultipler = 1;
		this.drag = drag;
		this.counter = 0;

		// Miscellaneous States
		this.hasntBeenInitiliazed = true
		this.canMove = true;
		this.isMoving = false;
		this.isDestroyed = false;
		this.state = 0;

		// Display
		this.maxHealth = this.health;
		this.healthDisplay = this.health;

		// Behavior
		this.behavior = behavior;
		this.attacks = attacks;
		this.death = death;
		this.event = event;

		// Sprite Info
		this.color = color;
		enemies.obj.push(this);
		enemies.s.push(this);
	}

	draw() {
		c.fillStyle = this.color;
		
		if (this.size.radius == 0) {
			c.save();
			c.translate(this.position.x, this.position.y);
			c.rotate(this.position.rotation * Math.PI / 180);
			c.fillRect(-this.size.width*0.5, -this.size.height*0.5, this.size.width, this.size.height);
			c.restore();
		}
		else {
			c.beginPath();
			c.arc(this.position.x, this.position.y, this.size.radius, 0, 2*Math.PI);
			c.fill();
			c.closePath();
		}
	}

	drawHealth() {
		// Health Display Math
		if (this.health < 0) this.health = 0;
		if (this.health != this.healthDisplay) {
			let regen = this.maxHealth*0.01;
			if (Math.abs(this.health - this.healthDisplay) < regen) this.healthDisplay = this.health;

			else if (this.health < this.healthDisplay) this.healthDisplay -= regen;
			else if (this.health > this.healthDisplay) this.healthDisplay += regen;
		}


		c.save();
		c.translate(canvas_width*0.5 - translated.x, 100 - translated.y);
			// Name
		c.fillStyle = 'white';
		c.font = 'Bold Italic 40px Helvetica';
		c.fillText(this.name, 0, 0);
			// Health Display
		c.fillStyle = 'orange';
		c.fillRect(-this.healthDisplay/this.maxHealth * 500, 15, this.healthDisplay/this.maxHealth * 1000, 40);
			// Actual Health
		c.fillStyle = 'red';
		c.fillRect(-this.health/this.maxHealth * 500, 15, this.health/this.maxHealth * 1000, 40);
		c.restore();
	}

	vectors() {
		this.velocity.x += this.acceleration.x * 0.01;
		this.velocity.y += this.acceleration.y * 0.01;

		this.position.x += this.velocity.x;
		this.position.y += this.velocity.y;

		// Drag
			// Velocity
		if (!this.isMoving) {
			if (this.velocity.x != 0) {
				if (Math.abs(this.velocity.x) > 0.1) this.velocity.x *= this.drag*0.09;
				else this.velocity.x = 0;
			}
			if (this.velocity.y != 0) {
				if (Math.abs(this.velocity.y) > 0.1) this.velocity.y *= this.drag*0.09;
				else this.velocity.y = 0;
			}
		}
			// Acceleration
		if (this.acceleration.x != 0) {
			if (Math.abs(this.acceleration.x) > 0.1) this.acceleration.x *= this.drag*0.09;
			else this.acceleration.x = 0;
		}
		if (this.acceleration.y != 0) {
			if (Math.abs(this.acceleration.y) > 0.1) this.acceleration.y *= this.drag*0.09;
			else this.acceleration.y = 0;
		}
	}

	tookDamage(damage, damageMultiplier, angle) {
		this.health -= damage * damageMultiplier * this.damageTakenMultipler;

		// Blood Effects
		let squirt = setInterval( () => {
			let randS = Math.floor(Math.random()*9) + 1;
			let angle2 = angle + Math.floor(Math.random()*80) - 40;
			let splatterStrength = Math.floor(Math.random()*30);

			let pos = {
				x: this.position.x,
				y: this.position.y,
				rotation: 0,
			}
			let s = {
				width: randS,
				height: randS,
				radius: 0
			}
			let shadow = new Effect(pos, s, blood);
			
			shadow.velocity.x = splatterStrength * Math.cos(angle2 * Math.PI/180);
			shadow.velocity.y = splatterStrength * Math.sin(angle2 * Math.PI/180);
		}, 5)
		setTimeout( () => {
			clearInterval(squirt);
		}, 100)
	}

	autoDelete() {
		if (this.health <= 0) {
			if (!this.isDead) {
				this.isDead = true;
				this.hasntBeenInitiliazed = true;
			}
			this.death(this);
		}

		if (this.isDestroyed) {
			for (let i in enemies.obj) {
				if (enemies.obj[i] === this) enemies.obj.splice(i, 1);
			}
			for (let i in enemies.s) {
				if (enemies.s[i] === this) enemies.s.splice(i, 1);
			}
		}

		if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.rotation)) {
			alert(`${this.position.x}, ${this.position.y}, ${this.position.rotation}`)
		}
	}

	update() {
		this.autoDelete();
		this.behavior(this);
		this.vectors();
		this.draw();
		this.drawHealth();
	}
}























class Projectile {
	constructor(position, {size, stats, action, attack, color}, targets, damageMultiplier=1) {
		this.position = position;
		this.velocity = {x: 0, y: 0};
		this.acceleration = {x: 0, y: 0};

		// Specific Stats
		this.size = size;
		this.stats = stats;
		this.action = action;
		this.attack = attack;
		this.color = color;

		// Caster Stats
		this.targets = targets
		this.damageMultiplier = damageMultiplier;

		// Other
		this.isDestroyed = false;
		projectiles.obj.push(this);

		if (player.isDestroyed) this.attack = () => {};
	}

	draw() {
		c.fillStyle = this.color;
		
		if (this.size.radius == 0) {
			c.save();
			c.translate(this.position.x, this.position.y);
			c.rotate(this.position.rotation * Math.PI / 180);
			c.fillRect(-this.size.width*0.5, -this.size.height*0.5, this.size.width, this.size.height);
			c.restore();
		}
		else {
			c.beginPath();
			c.arc(this.position.x, this.position.y, this.size.radius, 0, 2*Math.PI);
			c.fill();
			c.closePath();
		}
	}

	vectors() {
		this.velocity.x += this.acceleration.x * 0.01;
		this.velocity.y += this.acceleration.y * 0.01;

		this.position.x += this.velocity.x;
		this.position.y += this.velocity.y;

		// Drag
		if (this.acceleration.x != 0) {
			if (Math.abs(this.acceleration.x) > 0.1) this.acceleration.x *= drag*0.09;
			else this.acceleration.x = 0;
		}
		if (this.acceleration.y != 0) {
			if (Math.abs(this.acceleration.y) > 0.1) this.acceleration.y *= drag*0.09;
			else this.acceleration.y = 0;
		}
	}

	autoDelete() {
		if (getDistance(this, player) > canvas_width*3) this.isDestroyed = true;
		if (this.isDestroyed) {
			for (let i in projectiles.obj) {
				if (projectiles.obj[i] === this) projectiles.obj.splice(i, 1);
			}
		}
	}

	update() {
		this.action(this);
		this.vectors();
		this.autoDelete();
		this.draw();

		if (player.isDestroyed && player.destructionCountdown == 2) this.attack = () => {};
	}
}

















class Weapon {
	constructor(type, stats, action, sprite) {
		this.type = type;
		this.stats = stats;
		this.action = action;
		this.sprite = sprite;
	}
}

















































// Objects
	// Minions
const enemyNode = {
	size: {
		width: 50,
		height: 50,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 1000,
		walkSpeed: 0,
		fireRate: 0,
		cooldown: 0,
		score: 0,
		extra: 0
	},
	stats: null,
	behavior: (self) => {},
	attacks: (self, index) => {},
	death: (self) => {},
	color: 'indianred'
}

const testNode = {
	size: {
		width: 500,
		height: 500,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 1000,
		walkSpeed: 0,
		fireRate: 0,
		cooldown: 0,
		score: 0,
		extra: 0
	},
	stats: null,
	behavior: (self) => {
		self.position.rotation = 45;
		if (complexRectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(0, self.damageMultiplier, aim(self, player));
	},
	death: (self) => {},
	color: 'indianred'
}










const imp = {
	size: {
		width: 40,
		height: 40,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 200,
		walkSpeed: 15,
		fireRate: 0,
		cooldown: 0,
		score: 10,
		extra: 0
	},
	stats: {
		damage: 30,
		turnSpeed: 5
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, aim(self, player));
	},
	death: (self) => {},
	color: 'indianred'
}










const wall = {
	size: {
		width: 30,
		height: 80,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 2000,
		walkSpeed: 5,
		fireRate: 0,
		cooldown: 0,
		score: 10,
		extra: 0
	},
	stats: {
		damage: 60,
		turnSpeed: 2
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Attack
		if (rectangularCollision(player, self)) self.attacks(self, 0);

		// Spacing
		for (let i in enemies.obj) if (enemies.obj[i] != self && getDistance(self, enemies.obj[i]) < 200) {
			let other = enemies.obj[i];
			let distance = getDistance(self, other);
			let angle = aim(self, other);
			if (isNaN(angle)) angle = 0;
			self.velocity.x += self.walkSpeed * Math.cos(-angle * Math.PI/180) * (200-distance) * 0.01;
			self.velocity.y += self.walkSpeed * Math.sin(-angle * Math.PI/180) * (200-distance) * 0.01;
		}
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, aim(self, player));
	},
	death: (self) => {},
	color: 'lime'
}










const wretchedSoul = {
	size: {
		width: 60,
		height: 60,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 200,
		walkSpeed: 12,
		fireRate: 0,
		cooldown: 0,
		score: 25,
		extra: 0
	},
	stats: {
		damage: 100,
		turnSpeed: 5
	},
	behavior: (self) => {
		self.isMoving = true;
		self.position.rotation = aim(self, player);

		// Movement
		self.acceleration.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.acceleration.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, aim(self, player));
	},
	death: (self) => {},
	color: 'hotpink'
}








const gargoyle = {
	size: {
		width: 40,
		height: 40,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 200,
		walkSpeed: 0,
		fireRate: 50,
		cooldown: 0,
		score: 30,
		extra: 0
	},
	stats: {
		turnSpeed: 3,
		range: 600
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.extra;
		let direction = aim(self, player);
		let turn;
		self.position.rotation = direction;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.extra += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.extra = direction+rot;

		// Movement
		let walkSpeed = getDistance(self, player)*0.05;
		self.velocity.x = walkSpeed * Math.cos(self.extra * Math.PI/180);
		self.velocity.y = walkSpeed * Math.sin(self.extra * Math.PI/180);

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Fire
		if (getDistance(self, player) <= self.stats.range) {
			self.cooldown += self.fireRate;
			self.attacks(self, 0);
		}
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: aim(self, player)
		}
		let round = toxicWaste;

		let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = self.damageMultiplier;
	},
	death: (self) => {},
	color: 'blue'
}







const tortoise = {
	size: {
		width: 50,
		height: 50,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 1000,
		walkSpeed: 5,
		fireRate: 0,
		cooldown: 0,
		score: 50,
		extra: 0
	},
	stats: {
		damage: 500,
		turnSpeed: 1,
		range: 500,
		explosionRadius: 250
	},
	behavior: (self) => {
		// Deactivated
		if (!self.isMoving) self.position.rotation = aim(self, player);
		self.isMoving = true;

		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		let walkSpeed = (self.stats.range - getDistance(self, player))*0.08;
		if (walkSpeed <= self.walkSpeed) walkSpeed = self.walkSpeed;
		self.velocity.x = walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Attack
		let targets = enemies.obj;
		for (let i in targets) if (rectangularCollision(self, targets[i]) && self != targets[i]) {
			self.attacks(self, 0);
			self.isDestroyed = true;
		}
		if (rectangularCollision(self, player)) {
			self.attacks(self, 0);
			self.isDestroyed = true;
		}
	},
	attacks: (self, index) => {
		// Damage
		let targets = enemies.obj;
		for (let i in targets) if (getDistance(self, targets[i]) <= self.stats.explosionRadius && self != targets[i]) {
			targets[i].tookDamage(self.stats.damage, self.damageMultiplier, aim(self, targets[i]));
		}
		if (getDistance(self, player) <= self.stats.explosionRadius) {
			player.tookDamage(self.stats.damage, self.damageMultiplier, aim(self, player));
		}

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

		// Audio
		let sfx = new Audio('audio/explosion_sfx.mp3');
		sfx.play();
	},
	death: (self) => {self.attacks(self, 0)},
	color: 'orange'
}












const vampire = {
	size: {
		width: 50,
		height: 50,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 500,
		walkSpeed: 52,
		fireRate: 100,
		cooldown: 10,
		score: 80,
		extra: 0
	},
	stats: {
		damage: 80,
		dashDamage: 150,
		launchStrength: 40
	},
	behavior: (self) => {
		self.position.rotation = aim(self, player);

		// Movement / Dash
		if (self.fireRate > 0 && self.cooldown === 0) {
			self.cooldown = self.fireRate;
			self.fireRate = 0;

			self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
			self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);
		}

		// Summon Bat
		if (self.cooldown > 0) self.cooldown--;
		else if (self.fireRate === 0) {
			// Effect
			let pos = {
				x: self.position.x,
				y: self.position.y,
				rotation: 0,
			}
			let trans = new Minion(pos, vampireBat);
			trans.velocity = {
				x: -self.stats.launchStrength * Math.cos(aim(self, player)),
				y: -self.stats.launchStrength * Math.sin(aim(self, player))
			}
			self.isDestroyed = true;
		}

		// Attack
		if (rectangularCollision(self, player) && self.velocity.x != 0 && self.velocity.y != 0) self.attacks(self, 1);
		else if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		// Damage
		let damage;
		if (index) damage = self.stats.dashDamage;
		else damage = self.stats.damage;

		player.tookDamage(damage, self.damageMultiplier, self.position.rotation);
	},
	death: (self) => {},
	color: 'lightgrey'
}

const vampireBat = { //size, stats, action, attack, color
	size: {
		width: 25,
		height: 25,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 10,
		walkSpeed: 10,
		fireRate: 0,
		cooldown: 0,
		score: 80,
		extra: 0
	},
	stats: {
		range: 250,
		error: 50,
		turnSpeed: 3,
	},
	behavior: (self) => {
		self.isMoving = true;
		// Target
		let rotation = getPlayerDirection();
		let target = {
			position: {
				x: player.position.x + self.stats.range * Math.cos(rotation * Math.PI/180),
				y: player.position.y + self.stats.range * Math.sin(rotation * Math.PI/180),
				rotation: 0
			}
		}
		
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, target);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180) + player.velocity.x;
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180) + player.velocity.y;

		// Summon vampire
		if (getDistance(self, target) <= self.stats.error) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let trans = new Minion(pos, vampire);
		self.isDestroyed = true;
	},
	death: (self) => {},
	color: 'grey'
}










const necromancer = { //size, stats, action, attack, color
	size: {
		width: 40,
		height: 40,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 5000,
		walkSpeed: 5,
		fireRate: 500,
		cooldown: 0,
		score: 1200,
		extra: 0
	},
	stats: {
		damage: 1000,
		summonRan: 400,
		summonNum: 5,
		getAwayRange: 350,
		approachRange: 850,

		explosionRadius: 450
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = aim(self, player);
		let distance = getDistance(self, player);
		let walkSpeed = self.walkSpeed;
		self.position.rotation = rot;
		if (self.extra) rot += 180;
		else walkSpeed += distance*0.02;

		// Change Direction
		if (distance <= self.stats.getAwayRange) self.extra = 1; 
		else if (distance >= self.stats.approachRange) {
			self.extra = 0;
		}

		// Movement
		self.velocity.x = walkSpeed * Math.cos(rot * Math.PI/180);
		self.velocity.y = walkSpeed * Math.sin(rot * Math.PI/180);

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
		if (enemies.obj.length > spawnCap) return;
			// Fire
		self.cooldown += self.fireRate;
		for (let i=0; i<self.stats.summonNum; i++) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		let distance = Math.floor(Math.random()*(self.stats.summonRan*0.01)) * 100;
		let rot = Math.floor(Math.random()*360);
		let pos = {
			x: self.position.x + distance*Math.cos(rot * Math.PI/180),
			y: self.position.y + distance*Math.cos(rot * Math.PI/180),
			rotation: self.position.rotation,
		}
		let summoned = new Minion(pos, skeleton);
		summoned.cooldown = Math.floor(Math.random()*skeleton.genStats.fireRate);
	},
	death: (self) => {
		// Damage
		let targets = enemies.obj;
		for (let i in targets) if (getDistance(self, targets[i]) <= self.stats.explosionRadius && self != targets[i]) {
			targets[i].tookDamage(self.stats.damage, self.damageMultiplier, aim(self, targets[i]));
		}

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

		// Audio
		let sfx = new Audio('audio/explosion_sfx.mp3');
		sfx.play();
	},
	color: 'aqua'
}

const skeleton = { //size, stats, action, attack, color
	size: {
		width: 30,
		height: 30,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 1000,
		walkSpeed: 8,
		fireRate: 150,
		cooldown: 0,
		score: 10,
		extra: 0	// 0 is Approach, 1 is Back off
	},
	stats: {
		getAwayRange: 250,
		approachRange: 450,
		turnSpeed: 2
	},
	behavior: (self) => {
		self.isMoving = true;
		
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let distance = getDistance(self, player);
		let walkSpeed = self.walkSpeed;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Change State
		if (distance >= self.stats.approachRange && self.extra == 1) self.extra = 0;
		if (distance <= self.stats.getAwayRange && self.extra == 0) self.extra = 1;

		// Movement
		if (distance >= self.stats.approachRange && self.extra == 0) {
			self.velocity.x = walkSpeed * Math.cos(rot * Math.PI/180);
			self.velocity.y = walkSpeed * Math.sin(rot * Math.PI/180);
		}
		else if (distance <= self.stats.getAwayRange && self.extra == 1) {
			let ran = Math.floor(Math.random()*40) - 80;
			self.velocity.x = walkSpeed * Math.cos((rot-180 + ran) * Math.PI/180);
			self.velocity.y = walkSpeed * Math.sin((rot-180 + ran) * Math.PI/180);
		}

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Fire
		self.cooldown += self.fireRate;
		self.attacks(self, 0);
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: aim(self, player)
		}
		let round = linearArrow;

		let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = self.damageMultiplier;
	},
	death: (self) => {},
	color: 'white'
}









const merkavaMkMassacre = {
	size: {
		width: 120,
		height: 60,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 4000,
		walkSpeed: 3,
		fireRate: 2,
		cooldown: 0,
		score: 200,
		extra: 0
	},
	stats: {
		damage: 1000,
		range: 400,
		turnSpeed: 0.6,

		explosionRadius: 350
	},
	behavior: (self) => {
		self.isMoving = false;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		if (Math.abs(direction-rot) < 90) {
			self.isMoving = true;
			self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
			self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);
		}

		// Turret
		let length = 40
		if (self.extra == 0) {
			let pos = {
				x: self.position.x + length,
				y: self.position.y,
				rotation: 0
			}
			self.extra = new Minion(pos, merkavaMkMassacre_turret);
		}

		self.extra.position.x = self.position.x + length*Math.cos(self.extra.position.rotation * Math.PI/180);
		self.extra.position.y = self.position.y + length*Math.sin(self.extra.position.rotation * Math.PI/180);

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Fire
		if (getDistance(self, player) <= self.stats.range) {
			self.cooldown += self.fireRate;
			self.attacks(self, 0);
		}
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: aim(self, player)
		}
		let round = machineGunShot;

		let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = self.damageMultiplier;

			// Audio
		if (machineGun_sfx.currentTime > 0.04) machineGun_sfx.currentTime = 0;
		machineGun_sfx.play();
	},
	death: (self) => {
		// Kill Turret
		self.extra.isDestroyed = true;

		// Damage
		let targets = enemies.obj;
		for (let i in targets) if (getDistance(self, targets[i]) <= self.stats.explosionRadius && self != targets[i]) {
			targets[i].tookDamage(self.stats.damage, self.damageMultiplier, aim(self, targets[i]));
		}

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

		// Audio
		let sfx = new Audio('audio/explosion_sfx.mp3');
		sfx.play();
	},
	color: 'orange'
}

const merkavaMkMassacre_turret = {
	size: {
		width: 120,
		height: 30,
		radius: 0
	},
	rank: 'None',
	genStats: {
		health: 2000,
		walkSpeed: 0,
		fireRate: 250,
		cooldown: 0,
		score: 20,
		extra: 0
	},
	stats: {
		turnSpeed: 1
	},
	behavior: (self) => {
		self.acceleration = {x: 0, y: 0};

		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Fire
		if (Math.abs(direction-rot) < 5) {
			self.cooldown += self.fireRate;
			self.attacks(self, 0);
		}
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: self.position.rotation
		}
		let round = linearRifleShot;

		let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = self.damageMultiplier;

			// Audio
		let sfx = new Audio('audio/linearRifle_shot.mp3');
		sfx.play();
	},
	death: (self) => {},
	color: 'red'
}








const president = {
	size: {
		width: 45,
		height: 45,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 3000,
		walkSpeed: 15,
		fireRate: 1,
		cooldown: 0,
		score: 500,
		extra: 0
	},
	stats: {
		damage: 80,
		range: 800,
		turnSpeed: 5,
		inaccuracy: 2,

		teleportRange: 500,
		approachRange: 1500,
		summonNum: 5
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		direction %= 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		if (Math.abs(direction) < 45 || Math.abs(direction) > 225) {
			self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
			self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);
		}
		console.log(direction, rot)

		// Teleport
		if (self.health < 0) return

		if (self.health != self.extra) {
			self.attacks(self, 0);
			self.extra = self.health;
		}

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}

		if (getDistance(self, player) > self.stats.approachRange) self.attacks(self, 1)
			// Fire
		if ( (Math.abs(direction) < 5 || Math.abs(direction) > 265)  && getDistance(self, player) < self.stats.range) {
			self.cooldown += self.fireRate;
			self.attacks(self, 2);
		}

		// Hit
		if (rectangularCollision(self, player)) self.attacks(self, 3);
	},
	attacks: (self, index) => {
		if (index == 0) {
			let distance = Math.floor(Math.random()*self.stats.teleportRange);
			let angle = Math.floor(Math.random()*360) * Math.PI / 180;

			self.position.x += distance * Math.cos(angle);
			self.position.y += distance * Math.sin(angle);
			self.position.rotation = aim(self, player);
		}
		else if (index == 1) {
			let distance = 500;
			let angle = getPlayerDirection() * Math.PI/180;

			self.position.x = player.position.x + distance * Math.cos(angle);
			self.position.y = player.position.y + distance * Math.sin(angle);
			self.position.rotation = aim(self, player);

			// Summon
			let pos = {
				x: self.position.x,
				y: self.position.y,
				rotation: self.position.rotation
			}
			let summoned = new Minion(pos, vampireBat);
		}
		else if (index == 2) {
			let pos = {
				x: self.position.x,
				y: self.position.y,
				rotation: self.position.rotation + Math.floor(Math.random()*self.stats.inaccuracy*2) - self.stats.inaccuracy
			}
			let round = machineGunShot;

			let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
			projectile.velocity = {
				x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
				y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
			}
			projectile.stats.damageMultiplier = self.damageMultiplier;

				// Audio
			if (machineGun_sfx.currentTime > 0.04) machineGun_sfx.currentTime = 0;
			machineGun_sfx.play();
		}
		else if (index == 3) player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
	},
	death: (self) => {
		for (let i=0; i<self.stats.summonNum; i++) {
			let pos = {
				x: self.position.x + Math.floor(Math.random()*350) - 175,
				y: self.position.y + Math.floor(Math.random()*350) - 175,
				rotation: self.position.rotation
			}
			let summoned = new Minion(pos, wall);
		}
		screenShake(50);
	},
	color: 'lime'
}













const hellworm = {
	size: {
		width: 100,
		height: 100,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 2000,
		walkSpeed: 15,
		fireRate: 300,
		cooldown: 0,
		score: 1200,
		extra: 0
	},
	stats: {
		range: 1800,
		turnSpeed: 1,
		bodyLength_min: 10,
		bodyLength_max: 50
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Body
		let length = 100
		if (self.extra == 0) {
			self.extra = [0];
			let bodyLength = Math.floor(Math.random() * (self.stats.bodyLength_max-self.stats.bodyLength_min)) + self.stats.bodyLength_min;
			self.health = 4000 * bodyLength;
			for (let i=1; i<=bodyLength; i++) {
				pos = {
					x: self.position.x - length*i,
					y: self.position.y,
					rotation: 0
				}

				self.extra[i] = new Minion(pos, hellworm_body);
				self.extra[i].extra = self;
			}
			self.extra[0] = self;
		}

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Fire
		if (getDistance(self, player) <= self.stats.range) {
			self.cooldown += self.fireRate;
			self.attacks(self, 0);
		}
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: aim(self, player)
		}
		let round = linearRifleShot;

		let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = self.damageMultiplier;
	},
	death: (self) => {
		for (let i=1; i<self.extra.length; i++) self.extra[i].isDestroyed = true;
		hellworm.genStats.extra = 0;
	},
	color: 'indianred'
}

const hellworm_body = {
	size: {
		width: 100,
		height: 100,
		radius: 0
	},
	rank: 'None',
	genStats: {
		health: 2000,
		walkSpeed: 15,
		fireRate: 10,
		cooldown: 0,
		score: 50,
		extra: 0
	},
	stats: {
		damage: 0,
		range: 600,
		turnSpeed: 1,
		length: 100
	},
	behavior: (self) => {
		self.acceleration = {x: 0, y: 0};
		self.isMoving = true;
		// Direction
		let body = self.extra.extra;
		let target;
		for (let i=1; i<body.length; i++) if (body[i] === self) target = body[i-1];

		self.position.rotation = aim(self, target);
		if (isNaN(self.position.rotation)) self.position.rotation = 0;

		// Length Fix
		let rot = (self.position.rotation + 180) * Math.PI/180;
		self.position.x = target.position.x + self.stats.length * Math.cos(rot);
		self.position.y = target.position.y + self.stats.length * Math.sin(rot);

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Fire
		if (getDistance(self, player) <= self.stats.range) {
			self.cooldown += self.fireRate;
			self.attacks(self, 1);
		}
	},
	attacks: (self, index) => {
		// Change Position
		if (index == 0) {
			let body = self.extra.extra;
			let target;
			if (body[body.length-1] === self) return;
			for (let i=1; i<body.length-1; i++) if (body[i] == self) target = body[i+1];

			target.attacks(target, 0);
			target.position = {
				x: self.position.x,
				y: self.position.y,
				rotation: self.position.rotation
			}
		}

		// Actual Attack
		else if (index == 1) {
			let pos = {
				x: self.position.x,
				y: self.position.y,
				rotation: aim(self, player)
			}
			let round = toxicWaste;

			let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
			projectile.velocity = {
				x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
				y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
			}
			projectile.stats.damageMultiplier = self.damageMultiplier;
		}
	},
	death: (self) => {
		// Find Self
		let body = self.extra.extra;
		let index;
		for (let i=1; i<=body.length; i++) if (body[i] === self) index = i;

		self.extra.health -= hellworm_body.genStats.health * 2;
		self.attacks(self, 0);
		self.extra.extra.splice(index, 1);
	},
	color: 'yellow'
}









const coilHead = {
	size: {
		width: 40,
		height: 40,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 1000,
		walkSpeed: 25,
		fireRate: 0,
		cooldown: 0,
		score: 10,
		extra: 0
	},
	stats: {
		damage: 20,
		error: 60
	},
	behavior: (self) => {
		self.isMoving = false;
		// Stop or Move
		let playerSight = (player.position.rotation + 180 + 720) % 360;
		let stopSight = (aim(self, player) + 720) % 360;
		let sight = Math.abs(playerSight - stopSight);

		if (sight <= self.stats.error) return;
		else if ((playerSight >= 330 && stopSight < 30) || (stopSight >= 330 && playerSight < 30)) return;

		// Movement
		self.isMoving = true;
		self.position.rotation = aim(self, player);

		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, aim(self, player));
	},
	death: (self) => {},
	color: 'lightyellow'
}










const primeMinister = {
	size: {
		width: 80,
		height: 80,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 10000,
		walkSpeed: 400,
		fireRate: 100,
		cooldown: 0,
		score: 400,
		extra: 0
	},
	stats: {
		damage: 800,
		approachRange: 800,

		explosionRadius: 300
	},
	behavior: (self) => {
		// Walk
			// Cooldown
		if (getDistance(self, player) >= self.stats.approachRange) self.cooldown = 0;
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Movement
		self.cooldown += self.fireRate;
		self.position.rotation = aim(self, player);
		if (getDistance(self, player) <= self.walkSpeed) {
			self.position.x = player.position.x + Math.random()*80 - 40;
			self.position.y = player.position.y + Math.random()*80 - 40;
			self.attacks(self, 0);
		}
		else {
			self.position.x += self.walkSpeed * Math.cos(self.position.rotation * Math.PI / 180);
			self.position.y += self.walkSpeed * Math.sin(self.position.rotation * Math.PI / 180);
		}
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();
	},
	death: (self) => {},
	color: 'grey'
}








const beggar = {
	size: {
		width: 20,
		height: 20,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 400,
		walkSpeed: 30,
		fireRate: 2,
		cooldown: 0,
		score: 200,
		extra: 0
	},
	stats: {
		range: 300,
		inaccuracy: 10
	},
	behavior: (self) => {
		if (!self.extra) {
			self.health = 400;
			self.size = {
				width: 20,
				height: 20,
				radius: 0
			}
			self.extra = 1;
		}
		else if (self.extra == 1) {
			self.position.rotation = aim(self, player);
			self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
			self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

			if (getDistance(self, player) < self.stats.range) self.extra = 2;
		}
		else if (self.extra == 2) {
			self.velocity.x = player.velocity.x;
			self.velocity.y = player.velocity.y;

			// Attack
				// Cooldown
			if (self.cooldown > 0) {
				self.cooldown--;
				return;
			}
				// Fire
			self.cooldown += self.fireRate;
			self.attacks(self, 0);

			self.health += 10;
			self.size.width = 20 + self.health/400 * 10;
			self.size.height = self.size.width;
			
			if (getDistance(self, player) > self.stats.range + 50) self.extra = 1;
		}
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: aim(self, player) + Math.floor(Math.random()*self.stats.inaccuracy) - self.stats.inaccuracy*0.5
		}
		let round = stickyGoo;

		let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = self.damageMultiplier;
	},
	death: (self) => {},
	color: 'green'
}











const hatchling = {
	size: {
		width: 10,
		height: 10,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 100,
		walkSpeed: 15,
		fireRate: 0,
		cooldown: 0,
		score: 40,
		extra: 0
	},
	stats: {
		damage: 5,
		turnSpeed: 5,
		bodyLength_min: 10,
		bodyLength_max: 30
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Body
		let length = 100
		if (self.extra == 0) {
			self.extra = [0];
			let bodyLength = Math.floor(Math.random() * (self.stats.bodyLength_max-self.stats.bodyLength_min)) + self.stats.bodyLength_min;
			self.health = 100 * bodyLength;
			for (let i=1; i<=bodyLength; i++) {
				pos = {
					x: self.position.x - length*i,
					y: self.position.y,
					rotation: 0
				}

				self.extra[i] = new Minion(pos, hatchling_body);
				self.extra[i].extra = self;
			}
			self.extra[0] = self;
		}

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
	},
	death: (self) => {
		for (let i=1; i<self.extra.length; i++) self.extra[i].isDestroyed = true;
		hatchling.genStats.extra = 0;
	},
	color: 'indianred'
}

const hatchling_body = {
	size: {
		width: 10,
		height: 10,
		radius: 0
	},
	rank: 'None',
	genStats: {
		health: 100,
		walkSpeed: 0,
		fireRate: 0,
		cooldown: 0,
		score: 0,
		extra: 0
	},
	stats: {
		damage: 5,
		range: 600,
		turnSpeed: 1,
		length: 10
	},
	behavior: (self) => {
		self.acceleration = {x: 0, y: 0};
		self.isMoving = true;
		// Direction
		let body = self.extra.extra;
		let target;
		for (let i=1; i<body.length; i++) if (body[i] === self) target = body[i-1];

		self.position.rotation = aim(self, target);
		if (isNaN(self.position.rotation)) self.position.rotation = 0;

		// Length Fix
		let rot = (self.position.rotation + 180) * Math.PI/180;
		self.position.x = target.position.x + self.stats.length * Math.cos(rot);
		self.position.y = target.position.y + self.stats.length * Math.sin(rot);

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 1);
	},
	attacks: (self, index) => {
		// Change Position
		if (index == 0) {
			let body = self.extra.extra;
			let target;
			if (body[body.length-1] === self) return;
			for (let i=1; i<body.length-1; i++) if (body[i] == self) target = body[i+1];

			target.attacks(target, 0);
			target.position = {
				x: self.position.x,
				y: self.position.y,
				rotation: self.position.rotation
			}
		}

		// Actual Attack
		else if (index == 1) {
			player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
		}
	},
	death: (self) => {
		// Find Self
		let body = self.extra.extra;
		let index;
		for (let i=1; i<=body.length; i++) if (body[i] === self) index = i;

		self.extra.health -= hatchling_body.genStats.health * 2;
		self.attacks(self, 0);
		self.extra.extra.splice(index, 1);
	},
	color: 'yellow'
}













const saiyanRex = {
	size: {
		width: 150,
		height: 60,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 5000,
		walkSpeed: 15,
		fireRate: 100,
		cooldown: 0,
		score: 800,
		extra: 0
	},
	stats: {
		damage: 1000,
		turnSpeed: 5,
		ogTurnSpeed: 5,

		beamRange: 800,
		error: 7,
		tailSwipeRange: 500,

		approachRange: 2400,
		teleportRange: 1000,

		tailLength: 7,
		explosionRadius: 350
	},
	behavior: (self) => {
		self.isMoving = false;
		// Initialize
		let length = 70;
		if (self.extra == 0) {
			self.turnSpeed = self.stats.ogTurnSpeed;
			self.drag = 10.8;
			self.extra = [0];
			let pos = {
				x: self.position.x + length,
				y: self.position.y,
				rotation: 0
			}
			self.extra[0] = new Minion(pos, saiyanRex_head);
			self.extra[0].extra = 0;
			self.extra[1] = self;

			for (let i=0; i<self.stats.tailLength; i++) {
				let pos2 = {
					x: self.position.x - i*10,
					y: self.position.y,
					rotation: 0
				}
				self.extra[i+2] = new Minion(pos2, saiyanRex_tail);
				self.extra[i+2].extra = self;
			}
		}

		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		if (rot < 360) {
			self.stats.turnSpeed = self.stats.ogTurnSpeed;
		}
		//else self.extra[0].position.rotation = direction;

		direction -= rot;
		direction %= 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;


		// Teleport
		if (getDistance(self, player) > self.stats.approachRange) self.attacks(self, 2);

		// Movement
		let walkSpeed = self.walkSpeed;
		if (Math.abs(direction-rot) < 360) {
			self.isMoving = true;
			self.velocity.x = walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
			self.velocity.y = walkSpeed * Math.sin(self.position.rotation * Math.PI/180);
		}

		// Head
		self.extra[0].position.x = self.position.x + length*Math.cos(self.position.rotation * Math.PI/180) + self.extra[0].size.width*0.5*Math.cos(self.extra[0].position.rotation * Math.PI/180);
		self.extra[0].position.y = self.position.y + length*Math.sin(self.position.rotation * Math.PI/180) + self.extra[0].size.width*0.5*Math.sin(self.extra[0].position.rotation * Math.PI/180);

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}

			// Tail Swipe
		if (getDistance(self, player) <= self.stats.tailSwipeRange) {
			self.cooldown += self.fireRate;
			let pos = {
				x: player.position.x + player.velocity.x*10*Math.cos(aim(self, player) * Math.PI/180),
				y: player.position.y + player.velocity.y*10*Math.cos(aim(self, player) * Math.PI/180),
				rotation: 0
			} 

			self.velocity.x = walkSpeed * 2.2 * Math.cos(aim(self, {position: pos}) * Math.PI/180);
		 	self.velocity.y = walkSpeed * 2.2 * Math.sin(aim(self, {position: pos}) * Math.PI/180);
			self.attacks(self, 1);
			return;
		}

			// Fire
		if (getDistance(self, player) <= self.stats.beamRange  && !self.extra[0].isDestroyed && !self.extra[0].extra) {
			self.cooldown += self.fireRate;
			self.attacks(self, 0);
			return;
		}

		
		
	},
	attacks: (self, index) => {
		if (index == 0) {	// Saiyan Beam
			self.extra[0].extra = 1;
			// Audio
			let audio = new Audio('audio/saiyanRex_saiyanBeam.mp3');
			audio.play();

			let beam = setInterval( () => {
				let pos = {
					x: self.extra[0].position.x,
					y: self.extra[0].position.y,
					rotation: self.extra[0].position.rotation
				}
				let round = saiyanBeam;

				let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
				projectile.velocity = {
					x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
					y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
				}
				projectile.stats.damageMultiplier = self.damageMultiplier;
			}, 10)

			setTimeout( () => {
				clearInterval(beam);
				self.extra[0].extra = 0;
				audio.pause();
			}, 500)
		}
		else if (index == 1) {	// Tail Swipe
			self.position.rotation += 720;
			self.stats.turnSpeed = self.stats.ogTurnSpeed * 4;

			// Audio
			let audio = new Audio('audio/saiyanRex_tailSwipe.mp3');
			audio.play();
		}
		else if (index == 2) {	// Teleport
			let rot = getPlayerDirection() * Math.PI/180;
			self.position.x = player.position.x + self.stats.teleportRange*Math.cos(rot);
			self.position.y = player.position.y + self.stats.teleportRange*Math.sin(rot);
			self.position.rotation = aim(self, player);
			self.extra[0].position.rotation = aim(self, player);
		}
	},
	death: (self) => {
		// Kill Extra
		for (let i=0; i<self.extra.length; i++) self.extra[i].isDestroyed = true;
		saiyanRex.genStats.extra = 0;

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();
	},
	color: 'orange'
}

const saiyanRex_head = {
	size: {
		width: 100,
		height: 50,
		radius: 0
	},
	rank: 'None',
	genStats: {
		health: 4000,
		walkSpeed: 0,
		fireRate: 250,
		cooldown: 0,
		score: 20,
		extra: 0
	},
	stats: {
		damage: 80,
		pushStrength: 50,
		turnSpeed: 5
	},
	behavior: (self) => {
		self.acceleration = {x: 0, y: 0};
		if (self.extra) return;

		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
		player.acceleration.x += self.stats.pushStrength * Math.cos(self.position.rotation * Math.PI/180);
		player.acceleration.y += self.stats.pushStrength * Math.sin(self.position.rotation * Math.PI/180);
	},
	death: (self) => {},
	color: 'red'
}

const saiyanRex_tail = {
	size: {
		width: 40,
		height: 40,
		radius: 0
	},
	rank: 'None',
	genStats: {
		health: 100,
		walkSpeed: 15,
		fireRate: 10,
		cooldown: 0,
		score: 0,
		extra: 0
	},
	stats: {
		damage: 50,
		pushStrength: 300,
		range: 600,
		turnSpeed: 1,
		length: 40
	},
	behavior: (self) => {
		self.acceleration = {x: 0, y: 0};
		self.isMoving = true;
		self.damageTakenMultipler = 0;

		// Direction
		let body = self.extra.extra;
		let target;
		for (let i=2; i<body.length; i++) if (body[i] === self) target = body[i-1];

		self.position.rotation = aim(self, target);
		if (isNaN(self.position.rotation)) {
			self.position.rotation = 0;
		}

		// Length Fix
		let rot = (target.position.rotation + 180) * Math.PI/180;
		self.position.x = target.position.x + self.stats.length * Math.cos(rot);
		self.position.y = target.position.y + self.stats.length * Math.sin(rot);

		// Attack
		if (rectangularCollision(player, self)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		let rot = aim(self.extra, player) * Math.PI/180;
		player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
		player.acceleration.x += self.stats.pushStrength * Math.cos(rot);
		player.acceleration.y += self.stats.pushStrength * Math.sin(rot);
	},
	death: (self) => {},
	color: 'yellow'
}



















	// Supreme Demons
const gorefield = {
	size: {
		width: 120,
		height: 60,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 4000,
		walkSpeed: 10,
		fireRate: 2,
		cooldown: 0,
		score: 200,
		extra: 0
	},
	stats: {
		damage: 1000,
		range: 400,
		turnSpeed: 3,

		tailLength: 10,
		explosionRadius: 350
	},
	behavior: (self) => {
		self.isMoving = false;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		if (Math.abs(direction-rot) < 30) {
			self.isMoving = true;
			self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
			self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);
		}

		// Initialize
		let length = 80;
		if (self.extra == 0) {
			self.extra = [0];
			let pos = {
				x: self.position.x + length,
				y: self.position.y,
				rotation: 0
			}
			//self.extra[0] = new Minion(pos, gorefield_head);
			self.extra[0] = new Minion(pos, enemyNode);
			self.extra[1] = self;

			for (let i=0; i<self.stats.tailLength; i++) {
				let pos2 = {
					x: self.position.x - 100 - i*10,
					y: self.position.y,
					rotation: 0
				}
				self.extra[i+2] = new Minion(pos2, gorefield_tail);
				self.extra[i+2].extra = self;
			}
		}

		// Head
		self.extra[0].position.x = self.position.x + length*Math.cos(self.position.rotation * Math.PI/180);
		self.extra[0].position.y = self.position.y + length*Math.sin(self.position.rotation * Math.PI/180);

		// Attack
		
	},
	attacks: (self, index) => {},
	death: (self) => {
		// Kill Extra
		for (let i=1; i<self.extra.length; i++) self.extra[i].isDestroyed = true;
		gorefield.genStats.extra = 0;

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();
	},
	color: 'orange'
}

const gorefield_tail = {
	size: {
		width: 20,
		height: 20,
		radius: 0
	},
	rank: 'None',
	genStats: {
		health: 2000,
		walkSpeed: 15,
		fireRate: 10,
		cooldown: 0,
		score: 50,
		extra: 0
	},
	stats: {
		damage: 0,
		range: 600,
		turnSpeed: 1,
		length: 20
	},
	behavior: (self) => {
		self.acceleration = {x: 0, y: 0};
		self.isMoving = true;
		// Direction
		let body = self.extra.extra;
		let target;
		for (let i=2; i<body.length; i++) if (body[i] === self) target = body[i-1];

		self.position.rotation = aim(self, target);
		if (isNaN(self.position.rotation)) {
			self.position.rotation = 0;
		}

		// Length Fix
		let rot = (target.position.rotation + 180) * Math.PI/180;
		self.position.x = target.position.x + self.stats.length * Math.cos(rot);
		self.position.y = target.position.y + self.stats.length * Math.sin(rot);

		// Attack
			// Cooldown
		if (self.cooldown > 0) {
			self.cooldown--;
			return;
		}
			// Fire
		if (getDistance(self, player) <= self.stats.range) {
			self.cooldown += self.fireRate;
			self.attacks(self, 1);
		}
	},
	attacks: (self, index) => {
		// Change Position
		if (index == 0) {
			let body = self.extra.extra;
			let target;
			if (body[body.length-1] === self) return;
			for (let i=2; i<body.length-1; i++) if (body[i] == self) target = body[i+1];

			target.attacks(target, 0);
			target.position = {
				x: self.position.x,
				y: self.position.y,
				rotation: self.position.rotation
			}
		}

		// Actual Attack
		else if (index == 1) {}
	},
	death: (self) => {
		// Find Self
		let body = self.extra.extra;
		let index;
		for (let i=1; i<=body.length; i++) if (body[i] === self) index = i;

		self.attacks(self, 0);
		self.extra.extra.splice(index, 1);
	},
	color: 'yellow'
}













const testBoss = { //name, size, genStats, stats=null, behavior, attacks, death, color
	name: 'Gilbert, the Fag',
	size: {
		width: 100,
		height: 100,
		radius: 0
	},
	genStats: {
		health: 2000,
		walkSpeed: 15,
		fireRate: 0,
		cooldown: 0,
		score: 10,
		extra: 0
	},
	stats: {
		damage: 0,
		turnSpeed: 5,

		approachRange: 1000,
		getAwayRange: 300,

		statesNum: 3,
		changeStateCD: 200 
	},
	behavior: (self) => {
		if (self.health <= 0) return;
		if (self.counter) self.counter--;

		// Initialize
		if (self.hasntBeenInitiliazed) {
			self.hasntBeenInitiliazed = false;

			self.stats.turnSpeed = 5;
			self.color = 'red';
		}

		// State Handling
		if (!self.counter) {
			self.counter = self.stats.changeStateCD;
			self.state = Math.floor(Math.random() * self.stats.statesNum);
		}

		let rot = self.position.rotation;
		let walkSpeed = self.walkSpeed;
		if (self.state == 0) {
			self.isMoving = true;
			// Direction
			let direction = aim(self, player);
			let turn;

			direction -= rot;
			if (direction > 180) direction -= 360;
			else if (direction < -180) direction += 360;

			if (direction > 0) turn = self.stats.turnSpeed;
			else if (direction < 0) turn = -self.stats.turnSpeed;
			self.position.rotation += turn;
			if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;
			self.color = 'orange';
		}
		else if (self.state == 1) {
			self.position.rotation = aim(self, player);
			walkSpeed *= 0.5;
			walkSpeed = getDistance(self, player)*0.08;
			self.color = 'red';
		}
		else if (self.state == 2) {
			let distance = getDistance(self, player);
			self.position.rotation = aim(self, player);

			if (self.extra) rot += 180;
			else walkSpeed += distance*0.02;

				// Change Direction
			if (distance <= self.stats.getAwayRange) self.extra = 1; 
			else if (distance >= self.stats.approachRange) self.extra = 0;
			self.color = 'springGreen';
		}


		// Movement
		self.velocity.x = walkSpeed * Math.cos(rot * Math.PI/180);
		self.velocity.y = walkSpeed * Math.sin(rot * Math.PI/180);

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
	},
	death: (self) => {
		if (self.hasntBeenInitiliazed) {
			self.hasntBeenInitiliazed = false;
			self.isMoving = false;
			self.drag = 10.9;
			self.stats.turnSpeed = 20;
			self.counter = 80;
			self.color = 'red';
		}
		self.acceleration = {x:0, y:0};

			// Spin
		if (self.stats.turnSpeed > 0) self.stats.turnSpeed -= 0.08;
		else {
			self.stats.turnSpeed = 0;
			self.counter--;
		}
		self.position.rotation += self.stats.turnSpeed;

			// Explosions
		let randS = Math.floor(Math.random()*30) + 1;
		let pos = {
			x: self.position.x + Math.floor(Math.random()*self.size.width*2) - self.size.width,
			y: self.position.y + Math.floor(Math.random()*self.size.height*2) - self.size.height,
			rotation: 0
		}
		let s = {
			width: 0,
			height: 0,
			radius: randS
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

			// Destruction
		if (!self.stats.turnSpeed && !self.counter) {
			player.storedScore += self.score;
			self.isDestroyed = true;
			changeEvent = 0;

				// Blood
			for (let i=0; i<=360; i+=2) {
				randS = Math.floor(Math.random()*9) + 1;
				let angle = Math.floor(Math.random()*360);
				let splatterStrength = Math.floor(Math.random()*80);

				let pos2 = {
					x: self.position.x,
					y: self.position.y,
					rotation: 0,
				}
				let s2 = {
					width: randS,
					height: randS,
					radius: 0
				}
				let shadow2 = new Effect(pos2, s2, blood);
				
				shadow2.velocity.x = splatterStrength * Math.cos(angle * Math.PI/180);
				shadow2.velocity.y = splatterStrength * Math.sin(angle * Math.PI/180);
			}
		}
	},
	event: [ [0], [0] ],
	color: 'red'
}

































const rat = {
	size: {
		width: 40,
		height: 20,
		radius: 0
	},
	rank: 'Lesser',
	genStats: {
		health: 200,
		walkSpeed: 15,
		fireRate: 0,
		cooldown: 0,
		score: 10,
		extra: 0
	},
	stats: {
		damage: 30,
		range: 100,
		turnSpeed: 5
	},
	behavior: (self) => {
		self.isMoving = true;
		// Target
		let rotation = getPlayerDirection();
		let target = {
			position: {
				x: player.position.x + self.stats.range * Math.cos(rotation * Math.PI/180),
				y: player.position.y + self.stats.range * Math.sin(rotation * Math.PI/180),
				rotation: 0
			}
		}
		
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, target);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, aim(self, player));
	},
	death: (self) => {},
	color: 'sandybrown'
}

const ravager = {
	size: {
		width: 160,
		height: 90,
		radius: 0
	},
	rank: 'Greater',
	genStats: {
		health: 2000,
		walkSpeed: 30,
		fireRate: 0,
		cooldown: 0,
		score: 400,
		extra: 0
	},
	stats: {
		damage: 30,
		range: 100,
		pushStrength: 150,
		tailLength: 10,

		turnSpeed: 2
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		direction -= rot;
		if (direction > 180) direction -= 360;
		else if (direction < -180) direction += 360;

		if (direction > 0) turn = self.stats.turnSpeed;
		else if (direction < 0) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

		// Movement
		if (Math.abs(direction-rot) < 360) {
			self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
			self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);
		}

		// Attack
		if (rectangularCollision(self, player)) self.attacks(self, 0);

		// Initialize
		if (self.extra == 0) {
			let length = 20;
			self.extra = [0];
			for (let i=1; i<=self.stats.tailLength; i++) {
				pos = {
					x: self.position.x - self.size.width*0.5 - length*i,
					y: self.position.y,
					rotation: 0
				}

				self.extra[i] = new Minion(pos, ravager_tail);
				self.extra[i].damageTakenMultipler = 0;
				self.extra[i].extra = self;
			}
			self.extra[0] = self;
		}
	},
	attacks: (self, index) => {
		player.tookDamage(self.stats.damage, self.damageMultiplier, aim(self, player));

		// Knockback
		player.acceleration.x += self.stats.pushStrength * Math.cos(self.position.rotation * Math.PI/180);
		player.acceleration.y += self.stats.pushStrength * Math.sin(self.position.rotation * Math.PI/180);
	},
	death: (self) => {
		// Damage
		let targets = enemies.obj;
		for (let i in targets) if (getDistance(self, targets[i]) <= self.stats.explosionRadius && self != targets[i]) {
			targets[i].tookDamage(self.stats.damage, self.damageMultiplier, aim(self, targets[i]));
		}

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

		// Audio
		let sfx = new Audio('audio/explosion_sfx.mp3');
		sfx.play();

		// Destroy Tail
		for (let i in self.extra) self.extra[i].isDestroyed = true;
	},
	color: 'peru'
}

const ravager_tail = {
	size: {
		width: 20,
		height: 20,
		radius: 0
	},
	rank: 'None',
	genStats: {
		health: 100,
		walkSpeed: 0,
		fireRate: 0,
		cooldown: 0,
		score: 0,
		extra: 0
	},
	stats: {
		damage: 5,
		range: 600,
		turnSpeed: 1,

		length: 20
	},
	behavior: (self) => {
		self.acceleration = {x: 0, y: 0};
		self.isMoving = true;
		// Direction
		let body = self.extra.extra;
		let selfIndex;
		let target;
		for (let i=1; i<body.length; i++) if (body[i] === self) {
			target = body[i-1];
			selfIndex = i;
		}

		self.position.rotation = aim(self, target);
		if (isNaN(self.position.rotation)) self.position.rotation = 0;

		// Length Fix
		let rot = (self.position.rotation + 180) * Math.PI/180;
		let length = self.stats.length;
		if (selfIndex == 1) {
			length = self.extra.size.width*0.5;
			rot = (self.extra.position.rotation + 180) * Math.PI/180;
		}
		self.position.x = target.position.x + length * Math.cos(rot);
		self.position.y = target.position.y + length * Math.sin(rot);
	},
	attacks: (self, index) => {
		// Change Position
		if (index == 0) {
			let body = self.extra.extra;
			let target;
			if (body[body.length-1] === self) return;
			for (let i=1; i<body.length-1; i++) if (body[i] == self) target = body[i+1];

			target.attacks(target, 0);
			target.position = {
				x: self.position.x,
				y: self.position.y,
				rotation: self.position.rotation
			}
		}
	},
	death: (self) => {},
	color: 'pink'
}







const ratMage = { //name, size, genStats, stats=null, behavior, attacks, death, color
	name: 'Karina, the Rat Mage',
	size: {
		width: 50,
		height: 50,
		radius: 0
	},
	genStats: {
		health: 50000,
		walkSpeed: 15,
		fireRate: 0,
		cooldown: 0,
		score: 8000,
		extra: 0
	},
	stats: {
		damage: 0,
		turnSpeed: 5,

		approachRange: 1000,
		getAwayRange: 300,
		summonRan: 500,

		statesNum: 3,
		changeStateCD: 200 
	},
	behavior: (self) => {
		if (self.health <= 0) return;
		if (self.counter) self.counter--;

		// Initialize
		if (self.hasntBeenInitiliazed) {
			self.hasntBeenInitiliazed = false;

			self.stats.turnSpeed = 5;
			self.extra = [];

			// Guaranteed Initial State
			self.state = 1;
			self.counter = self.stats.changeStateCD;
		}


		// Fighting Ring
			// Draw
		c.save();
		c.beginPath();
		c.strokeStyle = 'red';
		c.lineWidth = 20;
		c.arc(self.position.x, self.position.y, 1800, 0, Math.PI*2);
		c.stroke();
		c.closePath();
		c.restore();
			// Border
		if (getDistance(self, player)-player.size.width*0.5 >= 1800) player.tookDamage(100, 1, aim(self, player));


		// State Handling
		if (!self.counter) {
			if (self.extra.length > 1) {
				for (let i in self.extra) {
					if (i == 0) continue;
					let rot = self.extra[i].position.rotation * Math.PI/180;
					self.extra[i].velocity.x = self.extra[i].stats.speed * Math.cos(rot);
					self.extra[i].velocity.y = self.extra[i].stats.speed * Math.sin(rot);
				}
			}
			self.counter = self.stats.changeStateCD;
			self.state = Math.floor(Math.random() * self.stats.statesNum);
			// self.state = Math.floor(Math.random() * 1)+1;
			self.cooldown = 0;
		}

		let rot = self.position.rotation;
		let walkSpeed = self.walkSpeed;


		if (self.state == 0) {			// First State
			self.isMoving = true;
			// Direction
			let direction = aim(self, player);
			let turn;

			direction -= rot;
			if (direction > 180) direction -= 360;
			else if (direction < -180) direction += 360;

			if (direction > 0) turn = self.stats.turnSpeed;
			else if (direction < 0) turn = -self.stats.turnSpeed;
			self.position.rotation += turn;
			if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

			// Attack
				// Cooldown
			if (self.cooldown > 0) self.cooldown--;
				// Fire
			else {
				self.cooldown += 30;
				self.attacks(self, 0);
			}
		}




		else if (self.state == 1) {			// Second State
			// Summon Rat Ring
			if (self.counter == self.stats.changeStateCD) {
				let n = 12
				for (let i=1; i<=n; i++) {
					let angle = (i*(360/n) + 45) * Math.PI/180
					pos = {
						x: self.position.x + 200*Math.cos(angle),
						y: self.position.y + 200*Math.sin(angle),
						rotation: 0
					}

					let round = ringOfRats;
					self.extra[i] = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
				}
			}

			// Summon Rats
			let distance = getDistance(self, player);
			self.position.rotation = aim(self, player);

			if (self.extra[0]) rot += 180;
			else walkSpeed += distance*0.02;

				// Change Direction
			if (distance <= self.stats.getAwayRange) self.extra[0] = 1; 
			else if (distance >= self.stats.approachRange) self.extra[0] = 0;

			// Attack
				// Cooldown
			if (self.cooldown > 0) self.cooldown--;
				// Fire
			else {
				self.cooldown += 1000;
				if (Math.floor(Math.random()*2)) for (let i=0; i<10; i++) self.attacks(self, 1);
				else self.attacks(self, 2);
			}
		}




		else if (self.state == 2) {			// Third State
			self.position.rotation = aim(self, player);
			walkSpeed *= 0.5;
			walkSpeed += getDistance(self, player)*0.02;

			// Attack
				// Cooldown
			if (self.cooldown > 0) self.cooldown--;
				// Fire
			else {
				self.cooldown += 1000;
				self.attacks(self, 3);
			}
		}


		// Movement
		self.velocity.x = walkSpeed * Math.cos(rot * Math.PI/180);
		self.velocity.y = walkSpeed * Math.sin(rot * Math.PI/180);

		// Move Rat Ring
		for (let i in self.extra) {
			if (i == 0) continue;
			let rot = (aim(self, self.extra[i]) + 10) * Math.PI/180;
			self.extra[i].position.x = self.position.x + 200*Math.cos(rot);
			self.extra[i].position.y = self.position.y + 200*Math.sin(rot);
			self.extra[i].position.rotation = aim(self.extra[i], self) - 90;

			self.extra[i].velocity.x = self.velocity.x;
			self.extra[i].velocity.y = self.velocity.y;
		}
	},
	attacks: (self, index) => {
		if (index == 0) {		// Rat-Puke Shotgun
			for (let i=0; i<20; i++) {
				let rot = aim(self, player);
				let pos = {
					x: self.position.x,
					y: self.position.y,
					rotation: rot + Math.floor(Math.random()*20 - 10)
				}
				let round = ratPuke;
				let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
				let power = Math.floor(Math.random()*10 + 1)*0.1 + 1;

				projectile.velocity = {
					x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180) * power,
					y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180) * power
				}
				projectile.stats.damageMultiplier = self.damageMultiplier;
			}
		}

		else if (index == 1) {	// Rat Summoning
			let distance = Math.floor(Math.random()*self.stats.summonRan);
			let rot = Math.floor(Math.random()*360);
			let pos = {
				x: self.position.x + distance*Math.cos(rot * Math.PI/180),
				y: self.position.y + distance*Math.cos(rot * Math.PI/180),
				rotation: rot,
			}
			let summoned = new Minion(pos, rat);
		}

		else if (index == 2) {	// Ravager Summoning
			let distance = Math.floor(Math.random()*self.stats.summonRan);
			let rot = Math.floor(Math.random()*360);
			let pos = {
				x: self.position.x + distance*Math.cos(rot * Math.PI/180),
				y: self.position.y + distance*Math.cos(rot * Math.PI/180),
				rotation: rot,
			}
			let summoned = new Minion(pos, ravager);
		}

		else if (index == 3) {	// Ravager Summoning
			let distance = Math.floor(Math.random()*self.stats.summonRan);
			let rot = Math.floor(Math.random()*360);
			let pos = {
				x: self.position.x + distance*Math.cos(rot * Math.PI/180),
				y: self.position.y + distance*Math.cos(rot * Math.PI/180),
				rotation: rot,
			}
			let summoned = new Minion(pos, ravager);
		}

		// player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
	},
	death: (self) => {
		self.extra = 0;
		if (self.hasntBeenInitiliazed) {
			self.hasntBeenInitiliazed = false;
			self.isMoving = false;
			self.drag = 10.9;
			self.stats.turnSpeed = 20;
			self.counter = 80;
			self.color = 'red';
		}
		self.acceleration = {x:0, y:0};

			// Spin
		if (self.stats.turnSpeed > 0) self.stats.turnSpeed -= 0.08;
		else {
			self.stats.turnSpeed = 0;
			self.counter--;
		}
		self.position.rotation += self.stats.turnSpeed;

			// Explosions
		let randS = Math.floor(Math.random()*30) + 1;
		let pos = {
			x: self.position.x + Math.floor(Math.random()*self.size.width*2) - self.size.width,
			y: self.position.y + Math.floor(Math.random()*self.size.height*2) - self.size.height,
			rotation: 0
		}
		let s = {
			width: 0,
			height: 0,
			radius: randS
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

			// Destruction
		if (!self.stats.turnSpeed && !self.counter) {
			player.storedScore += self.score;
			self.isDestroyed = true;
			changeEvent = 0;

				// Blood
			for (let i=0; i<=360; i+=2) {
				randS = Math.floor(Math.random()*9) + 1;
				let angle = Math.floor(Math.random()*360);
				let splatterStrength = Math.floor(Math.random()*80);

				let pos2 = {
					x: self.position.x,
					y: self.position.y,
					rotation: 0,
				}
				let s2 = {
					width: randS,
					height: randS,
					radius: 0
				}
				let shadow2 = new Effect(pos2, s2, blood);
				
				shadow2.velocity.x = splatterStrength * Math.cos(angle * Math.PI/180);
				shadow2.velocity.y = splatterStrength * Math.sin(angle * Math.PI/180);
			}
		}
	},
	event: [ [rat, 3], [ravager, 1] ],
	color: 'violet'
}





































const motherwall = { //name, size, genStats, stats=null, behavior, attacks, death, color
	name: 'Sins of Motherwall',
	size: {
		width: 50,
		height: 50,
		radius: 0
	},
	genStats: {
		health: 200000,
		walkSpeed: 15,
		fireRate: 0,
		cooldown: 0,
		score: 10000,
		extra: 0
	},
	stats: {
		damage: 0,
		turnSpeed: 5,

		approachRange: 1000,
		getAwayRange: 300,
		summonRan: 500,

		statesNum: 3,
		changeStateCD: 200 
	},
	behavior: (self) => {
		if (self.health <= 0) return;
		if (self.counter) self.counter--;

		// Initialize
		if (self.hasntBeenInitiliazed) {
			self.hasntBeenInitiliazed = false;

			self.stats.turnSpeed = 5;
			self.extra = [];

			// Guaranteed Initial State
			self.state = 1;
			self.counter = self.stats.changeStateCD;
		}


		// Fighting Ring
			// Draw
		c.save();
		c.beginPath();
		c.strokeStyle = 'red';
		c.lineWidth = 20;
		c.arc(self.position.x, self.position.y, 1800, 0, Math.PI*2);
		c.stroke();
		c.closePath();
		c.restore();
			// Border
		if (getDistance(self, player)-player.size.width*0.5 >= 1800) player.tookDamage(100, 1, aim(self, player));


		// State Handling
		if (!self.counter) {
			if (self.extra.length > 1) {
				for (let i in self.extra) {
					if (i == 0) continue;
					let rot = self.extra[i].position.rotation * Math.PI/180;
					self.extra[i].velocity.x = self.extra[i].stats.speed * Math.cos(rot);
					self.extra[i].velocity.y = self.extra[i].stats.speed * Math.sin(rot);
				}
			}
			self.counter = self.stats.changeStateCD;
			self.state = Math.floor(Math.random() * self.stats.statesNum);
			// self.state = Math.floor(Math.random() * 1)+1;
			self.cooldown = 0;
		}

		let rot = self.position.rotation;
		let walkSpeed = self.walkSpeed;


		if (self.state == 0) {			// First State
			self.isMoving = true;
			// Direction
			let direction = aim(self, player);
			let turn;

			direction -= rot;
			if (direction > 180) direction -= 360;
			else if (direction < -180) direction += 360;

			if (direction > 0) turn = self.stats.turnSpeed;
			else if (direction < 0) turn = -self.stats.turnSpeed;
			self.position.rotation += turn;
			if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;

			// Attack
				// Cooldown
			if (self.cooldown > 0) self.cooldown--;
				// Fire
			else {
				self.cooldown += 30;
				self.attacks(self, 0);
			}
		}




		else if (self.state == 1) {			// Second State
			// Summon Rat Ring
			if (self.counter == self.stats.changeStateCD) {
				let n = 12
				for (let i=1; i<=n; i++) {
					let angle = (i*(360/n) + 45) * Math.PI/180
					pos = {
						x: self.position.x + 200*Math.cos(angle),
						y: self.position.y + 200*Math.sin(angle),
						rotation: 0
					}

					let round = ringOfRats;
					self.extra[i] = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
				}
			}

			// Summon Rats
			let distance = getDistance(self, player);
			self.position.rotation = aim(self, player);

			if (self.extra[0]) rot += 180;
			else walkSpeed += distance*0.02;

				// Change Direction
			if (distance <= self.stats.getAwayRange) self.extra[0] = 1; 
			else if (distance >= self.stats.approachRange) self.extra[0] = 0;

			// Attack
				// Cooldown
			if (self.cooldown > 0) self.cooldown--;
				// Fire
			else {
				self.cooldown += 1000;
				if (Math.floor(Math.random()*2)) for (let i=0; i<10; i++) self.attacks(self, 1);
				else self.attacks(self, 2);
			}
		}




		else if (self.state == 2) {			// Third State
			self.position.rotation = aim(self, player);
			walkSpeed *= 0.5;
			walkSpeed += getDistance(self, player)*0.02;

			// Attack
				// Cooldown
			if (self.cooldown > 0) self.cooldown--;
				// Fire
			else {
				self.cooldown += 1000;
				self.attacks(self, 3);
			}
		}


		// Movement
		self.velocity.x = walkSpeed * Math.cos(rot * Math.PI/180);
		self.velocity.y = walkSpeed * Math.sin(rot * Math.PI/180);

		// Move Rat Ring
		for (let i in self.extra) {
			if (i == 0) continue;
			let rot = (aim(self, self.extra[i]) + 10) * Math.PI/180;
			self.extra[i].position.x = self.position.x + 200*Math.cos(rot);
			self.extra[i].position.y = self.position.y + 200*Math.sin(rot);
			self.extra[i].position.rotation = aim(self.extra[i], self) - 90;

			self.extra[i].velocity.x = self.velocity.x;
			self.extra[i].velocity.y = self.velocity.y;
		}
	},
	attacks: (self, index) => {
		if (index == 0) {		// Rat-Puke Shotgun
			for (let i=0; i<20; i++) {
				let rot = aim(self, player);
				let pos = {
					x: self.position.x,
					y: self.position.y,
					rotation: rot + Math.floor(Math.random()*20 - 10)
				}
				let round = ratPuke;
				let projectile = new Projectile(pos, round, {obj:[player]}, self.damageMultiplier);
				let power = Math.floor(Math.random()*10 + 1)*0.1 + 1;

				projectile.velocity = {
					x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180) * power,
					y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180) * power
				}
				projectile.stats.damageMultiplier = self.damageMultiplier;
			}
		}

		else if (index == 1) {	// Rat Summoning
			let distance = Math.floor(Math.random()*self.stats.summonRan);
			let rot = Math.floor(Math.random()*360);
			let pos = {
				x: self.position.x + distance*Math.cos(rot * Math.PI/180),
				y: self.position.y + distance*Math.cos(rot * Math.PI/180),
				rotation: rot,
			}
			let summoned = new Minion(pos, rat);
		}

		else if (index == 2) {	// Ravager Summoning
			let distance = Math.floor(Math.random()*self.stats.summonRan);
			let rot = Math.floor(Math.random()*360);
			let pos = {
				x: self.position.x + distance*Math.cos(rot * Math.PI/180),
				y: self.position.y + distance*Math.cos(rot * Math.PI/180),
				rotation: rot,
			}
			let summoned = new Minion(pos, ravager);
		}

		else if (index == 3) {	// Ravager Summoning
			let distance = Math.floor(Math.random()*self.stats.summonRan);
			let rot = Math.floor(Math.random()*360);
			let pos = {
				x: self.position.x + distance*Math.cos(rot * Math.PI/180),
				y: self.position.y + distance*Math.cos(rot * Math.PI/180),
				rotation: rot,
			}
			let summoned = new Minion(pos, ravager);
		}

		// player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
	},
	death: (self) => {
		self.extra = 0;
		if (self.hasntBeenInitiliazed) {
			self.hasntBeenInitiliazed = false;
			self.isMoving = false;
			self.drag = 10.9;
			self.stats.turnSpeed = 20;
			self.counter = 80;
			self.color = 'red';
		}
		self.acceleration = {x:0, y:0};

			// Spin
		if (self.stats.turnSpeed > 0) self.stats.turnSpeed -= 0.08;
		else {
			self.stats.turnSpeed = 0;
			self.counter--;
		}
		self.position.rotation += self.stats.turnSpeed;

			// Explosions
		let randS = Math.floor(Math.random()*30) + 1;
		let pos = {
			x: self.position.x + Math.floor(Math.random()*self.size.width*2) - self.size.width,
			y: self.position.y + Math.floor(Math.random()*self.size.height*2) - self.size.height,
			rotation: 0
		}
		let s = {
			width: 0,
			height: 0,
			radius: randS
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

			// Destruction
		if (!self.stats.turnSpeed && !self.counter) {
			player.storedScore += self.score;
			self.isDestroyed = true;
			changeEvent = 0;

				// Blood
			for (let i=0; i<=360; i+=2) {
				randS = Math.floor(Math.random()*9) + 1;
				let angle = Math.floor(Math.random()*360);
				let splatterStrength = Math.floor(Math.random()*80);

				let pos2 = {
					x: self.position.x,
					y: self.position.y,
					rotation: 0,
				}
				let s2 = {
					width: randS,
					height: randS,
					radius: 0
				}
				let shadow2 = new Effect(pos2, s2, blood);
				
				shadow2.velocity.x = splatterStrength * Math.cos(angle * Math.PI/180);
				shadow2.velocity.y = splatterStrength * Math.sin(angle * Math.PI/180);
			}
		}
	},
	event: [ [rat, 3], [ravager, 1] ],
	color: 'violet'
}
















































const lesserDemons = [testNode, imp, wall, wretchedSoul, gargoyle, tortoise, vampire, vampireBat, merkavaMkMassacre, skeleton, coilHead, hatchling, rat, ravager];
const greaterDemons = [necromancer, president, hellworm, primeMinister, beggar, saiyanRex];
const supremeDemons = [testBoss, ratMage, motherwall];

const impsOnAMineField_spawn = [ [imp, imp, imp, imp, tortoise, 25], [0] ];
const classic_spawn = [ [imp, imp, wall, wretchedSoul, 25], [0] ];
const toxicWalls_spawn = [ [imp, wall, wretchedSoul, gargoyle, 20], [0] ];
const explosiveWalls_spawn = [ [imp, imp, imp, imp, wall, wall, tortoise, 30], [0] ];
const explosiveToxins_spawn = [ [imp, imp, gargoyle, gargoyle, tortoise, 20], [0] ];
const spooky_spawn = [ [imp, imp, gargoyle, vampireBat, 20], [0] ];
const necromancinDancin_spawn = [ [vampireBat, 10], [necromancer, 1] ];
const battlefield_spawn = [ [merkavaMkMassacre, merkavaMkMassacre, merkavaMkMassacre, tortoise, wretchedSoul, 10], [0] ];
const doom_spawn = [ [imp, imp, wretchedSoul, hatchling, 12], [hellworm, 1] ]; 
const courtOfHell_spawn = [ [coilHead, vampireBat, 10], [primeMinister, president, 2] ];
const slumsOfHell_spawn = [ [coilHead, coilHead, coilHead, gargoyle, 20], [beggar, 1] ];
const greatWall_spawn = [ [imp, wall, wall, wall, wall, wall, merkavaMkMassacre, 16], [necromancer, 1] ];
const biowar_spawn = [ [hatchling, hatchling, merkavaMkMassacre, 8], [hellworm, 1] ];
const cretaciousSins_spawn = [ [hatchling, coilHead, coilHead, coilHead, 15], [saiyanRex, 2] ];
const mechaMayhem_spawn = [ [merkavaMkMassacre, skeleton, skeleton, skeleton, 15], [saiyanRex, president, 2] ];
const disposable_spawn = [ [imp, skeleton, 15], [beggar, president, 3] ]; //

let spawnEvents = [impsOnAMineField_spawn, classic_spawn, toxicWalls_spawn, explosiveWalls_spawn, explosiveToxins_spawn, spooky_spawn, necromancinDancin_spawn, battlefield_spawn, doom_spawn, courtOfHell_spawn, slumsOfHell_spawn, greatWall_spawn, biowar_spawn, cretaciousSins_spawn, mechaMayhem_spawn, disposable_spawn];

//spawnEvents = [ [ [testNode, 1], [0] ] ];
//spawnEvents = [ classic_spawn ];
//spawnEvents = [ [ [imp, 15], [president, necromancer, 2] ] ];

// Showcase
// spawnEvents = [ [ [merkavaMkMassacre, 10], [0] ] ];
// spawnEvents = [ [ [skeleton, 2], [necromancer, 1] ] ];
// spawnEvents = [ [ [enemyNode, 2], [president, 1] ] ];
// spawnEvents = [ [ [enemyNode, 2], [hellworm, 1] ] ];
//spawnEvents = [ [ [imp, coilHead, gargoyle, merkavaMkMassacre, 12], [hellworm, president, primeMinister, 2] ] ];
//spawnEvents = [ necromancinDancin_spawn ];
//spawnEvents = [ [ [hatchling, imp, 10], [hellworm, 1] ] ];
//spawnEvents = [ spooky_spawn, necromancinDancin_spawn, explosiveToxins_spawn ];
//spawnEvents = [ [ [0], [saiyanRex, 2] ] ];
//spawnEvents = [ [ [merkavaMkMassacre, 10], [0] ] ];
//spawnEvents = [ [ [imp, 20], [0] ] ];
//spawnEvents = [ [ [imp, 15], [president, necromancer, 2] ] ];
//spawnEvents = [ [ [rat, 30], [ravager, 4] ] ];
//spawnEvents = [ [ [0], [saiyanRex, 4] ] ];
//spawnEvents = [ [ [0], [president, 1] ] ];
//spawnEvents = [ [ [0], [0] ] ];











//let test = new Boss({x:-100, y:-100, rotation:0}, testBoss);
//let test = new Boss({x:-100, y:-100, rotation:0}, ratMage);































	// Projectiles
const linearRifleShot = { //size, stats, action, attack, color
	size: {
		width: 150,
		height: 15,
		radius: 0
	},
	stats: {
		damage: 500,
		speed: 80,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
	},
	color: 'white'
}

const toxicWaste = { //size, stats, action, attack, color
	size: {
		width: 30,
		height: 30,
		radius: 0
	},
	stats: {
		damage: 200,
		speed: 30,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (complexRectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
		self.isDestroyed = true;
	},
	color: 'purple'
}

const missile = { //size, stats, action, attack, color
	size: {
		width: 30,
		height: 20,
		radius: 0
	},
	stats: {
		damage: 200,
		speed: 20,
		turnSpeed: 5,
		trailRadius: 10,
		explosionRadius: 25,
		damageMultiplier: 1
	},
	action: (self) => {
		// Direction
		let rot = self.position.rotation;
		let direction;
		let turn;
		let target = self.targets.obj[0];

		for (let i in self.targets.obj) {
			if (getDistance(self, self.targets.obj[i]) < getDistance(self, target)) target = self.targets.obj[i];
		}

		if (self.targets.obj.length > 0) do {
			direction = aim(self, target);

			direction -= rot;
			if (direction > 180) direction -= 360;
			else if (direction < -180) direction += 360;

			// Nullify
			if (Math.abs(direction) > 90) break;
			//

			if (direction > 0) turn = self.stats.turnSpeed;
			else if (direction < 0) turn = -self.stats.turnSpeed;
			self.position.rotation += turn;
			if (Math.abs(direction) < self.stats.turnSpeed) self.position.rotation = direction+rot;
		} while (false);

		// Movement
		self.velocity.x = self.stats.speed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.stats.speed * Math.sin(self.position.rotation * Math.PI/180);

		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) {
				self.attack(self, target);
			}
		}

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.trailRadius
		}
		let shadow = new Effect(pos, s, explosion);
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
		self.isDestroyed = true;

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
	},
	color: 'white'
}

const linearArrow = { //size, stats, action, attack, color
	size: {
		width: 150,
		height: 10,
		radius: 0
	},
	stats: {
		damage: 300,
		speed: 60,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
	},
	color: 'grey'
}

const chainsaw = { //size, stats, action, attack, color
	size: {
		width: 30,
		height: 250,
		radius: 0
	},
	stats: {
		damage: 50,
		speed: 40,
		pushStrength: 5000,
		damageMultiplier: 1,
		time: 0,
		selfDestructTime: 25
	},
	action: (self) => {
		// Countdown
		if (self.stats.time) self.stats.time--;
		else {
			self.isDestroyed = true;
			return
		}

		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (complexRectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		if (self.isDestroyed) return

		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
		target.acceleration.x = self.stats.pushStrength * Math.cos(self.position.rotation * Math.PI/180);
		target.acceleration.y = self.stats.pushStrength * Math.sin(self.position.rotation * Math.PI/180);
	},
	color: 'red'
}

const machineGunShot = { //size, stats, action, attack, color
	size: {
		width: 10,
		height: 10,
		radius: 0
	},
	stats: {
		damage: 30,
		speed: 30,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
		self.isDestroyed = true;
	},
	color: 'white'
}

const stickyGoo = { //size, stats, action, attack, color
	size: {
		width: 10,
		height: 10,
		radius: 5
	},
	stats: {
		damage: 15,
		speed: 10,
		damageMultiplier: 1
	},
	action: (self) => {
		// Movement
		self.velocity.x = self.stats.speed * Math.cos(self.position.rotation * Math.PI/180) + player.velocity.x;
		self.velocity.y = self.stats.speed * Math.sin(self.position.rotation * Math.PI/180) + player.velocity.y;

		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		if (!isNaN(target.stability)) {
			if (target.isStable) target.stability -= self.stats.damage;
		}
		else target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
		self.isDestroyed = true;
	},
	color: 'lightgreen'
}

const mazerRocket = { //size, stats, action, attack, color
	size: {
		width: 60,
		height: 25,
		radius: 0
	},
	stats: {
		damage: 3000,
		speed: 60,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		let explosionRadius = 300;
		for (let i=0; i<enemies.obj.length; i++) {
			let target = enemies.obj[i];
			if (getDistance(self, target) <= explosionRadius) {
				target.tookDamage(self.stats.damage, player.damageMultiplier, aim(player, target));
			}
		}

		// Effect
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		screenShake();

		self.isDestroyed = true;
	},
	color: 'white'
}

const saiyanBeam = { //size, stats, action, attack, color
	size: {
		width: 150,
		height: 20,
		radius: 0
	},
	stats: {
		damage: 10,
		speed: 100,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (complexRectangularCollision(self, target)) self.attack(self, target);
		}
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
	},
	color: 'cyan'
}

const superShotgunShot = { //size, stats, action, attack, color
	size: {
		width: 20,
		height: 10,
		radius: 0
	},
	stats: {
		damage: 250,
		speed: 50,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(target, self)) self.attack(self, target);
		}

		// Destoryed
		setTimeout( () => {
			self.isDestroyed = true;
		}, 60)
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
	},
	color: 'yellow'
}

const ratPuke = { //size, stats, action, attack, color
	size: {
		width: 0,
		height: 0,
		radius: 20
	},
	stats: {
		damage: 200,
		speed: 30,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (getDistance(self, target) <= self.size.radius) self.attack(self, target);
		}

		// Destoryed
		setTimeout( () => {
			self.isDestroyed = true;
		}, 200)
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
	},
	color: 'lime'
}

const ringOfRats = { //size, stats, action, attack, color
	size: {
		width: 40,
		height: 20,
		radius: 0
	},
	stats: {
		damage: 200,
		speed: 25,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (getDistance(self, target) <= self.size.radius) self.attack(self, target);
		}

		for (let i in projectiles.obj) {
			let target = projectiles.obj[i];
			if (target === self) continue;
			if (getDistance(self, target) <= 20) {
				target.isDestroyed = true;

				// Effect
				let pos = {
					x: self.position.x,
					y: self.position.y,
					rotation: 0,
				}
				let s = {
					width: 0,
					height: 0,
					radius: 30
				}
				let shadow = new Effect(pos, s, explosion);
			}
		}
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
	},
	color: 'cornsilk'
}




























	// Weapons
const linearRifle = new Weapon( //type, stats, action
	"Ranged",			// Type
	{					// Stats
		round: linearRifleShot,
		fireRate: 20,
		cooldown: 0
	},
	(self) => {			// Action
		// Cooldown
		self.stats.cooldown = self.stats.fireRate;

		// Fire
		let pos = {
			x: player.position.x,
			y: player.position.y,
			rotation: player.position.rotation
		}
		let round = self.stats.round;

		let projectile = new Projectile(pos, round, enemies, player.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = player.damageMultiplier;

		// Audio
		let sfx = new Audio('audio/linearRifle_shot.mp3');
		sfx.play();
	},
	new Image() 		// Sprite
)
linearRifle.sprite.src = 'images/placeHolder_weapon.png';

const missileLauncher = new Weapon( //type, stats, action
	"Ranged",			// Type
	{					// Stats
		round: missile,
		fireRate: 200,
		cooldown: 0
	},
	(self) => {			// Action
		// Cooldown
		self.stats.cooldown = self.stats.fireRate;

		// Audio
		let sfx = new Audio('audio/arcade_explosion.mp3');
		sfx.play();

		// Fire
		let fire = setInterval( () => {
			let pos = {
				x: player.position.x,
				y: player.position.y,
				rotation: player.position.rotation
			}
			let round = self.stats.round;

			let projectile = new Projectile(pos, round, enemies, player.damageMultiplier);
			projectile.velocity = {
				x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
				y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
			}
			projectile.stats.damageMultiplier = player.damageMultiplier;

			

			// Audio
			sfx.currentTime = 0;
		}, 80)

		setTimeout( () => {
			clearInterval(fire);
		}, 1000)
	},
	new Image() 		// Sprite
)
missileLauncher.sprite.src = 'images/placeHolder_weapon.png';

const chainsawLauncher = new Weapon( //type, stats, action
	"Ranged",			// Type
	{					// Stats
		round: chainsaw,
		fireRate: 200,
		cooldown: 0
	},
	(self) => {			// Action
		// Cooldown
		self.stats.cooldown = self.stats.fireRate;

		// Fire
		let pos = {
			x: player.position.x,
			y: player.position.y,
			rotation: player.position.rotation
		}
		let round = self.stats.round;

		let projectile = new Projectile(pos, round, enemies, player.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = player.damageMultiplier;
		projectile.stats.time = projectile.stats.selfDestructTime;

		// Audio
		let sfx = new Audio('audio/chainsawLauncher_shot.mp3');
		sfx.play();
	},
	new Image() 		// Sprite
)
chainsawLauncher.sprite.src = 'images/placeHolder_weapon.png';

const assaultArmor = new Weapon( //type, stats, action
	"Miscellaneous",	// Type
	{					// Stats
		damage: 8000,
		fireRate: 1000,
		cooldown: 1000,
		explosionRadius: 500
	},
	(self) => {			// Action
		player.isMoving = false;

		// Cooldown
		self.stats.cooldown = self.stats.fireRate;
		self.stats.delayTime = self.stats.delay;

		// Fire
		for (let i=0; i<enemies.obj.length; i++) {
			let target = enemies.obj[i];
			if (getDistance(player, target) <= self.stats.explosionRadius) {
				target.tookDamage(self.stats.damage, player.damageMultiplier, aim(player, target));
			}
		}

		// Effect
		let pos = {
			x: player.position.x,
			y: player.position.y,
			rotation: 0,
		}
		let s = {
			width: 0,
			height: 0,
			radius: self.stats.explosionRadius
		}
		let s2 = {
			width: self.stats.explosionRadius*2,
			height: self.stats.explosionRadius*2,
			radius: self.stats.explosionRadius
		}
		let shadow = new Effect(pos, s, explosion);
		shadow.color = 'cyan';
		let zap = new Effect(pos, s2, electricity);
		screenShake(50, 20);

		// Audio
		let boom = new Audio('audio/explosion_sfx.mp3');
		let buzz = new Audio('audio/assaultArmor_sfx.mp3');
		boom.play();
		buzz.play();

		// Delete Zap
		let checkDestruction = setInterval( () => {
			if (shadow.isDestroyed) {
				clearInterval( checkDestruction );

				setTimeout( () => {
					zap.isDestroyed = true;
				}, 1000)
			}
		}, 20)
	},
	new Image() 		// Sprite
)
assaultArmor.sprite.src = 'images/placeHolder_weapon.png';

const mazerBazooka = new Weapon( //type, stats, action
	"Ranged",			// Type
	{					// Stats
		round: mazerRocket,
		fireRate: 50,
		cooldown: 0
	},
	(self) => {			// Action
		// Cooldown
		self.stats.cooldown = self.stats.fireRate;

		// Fire
		let pos = {
			x: player.position.x,
			y: player.position.y,
			rotation: player.position.rotation
		}
		let round = self.stats.round;

		let projectile = new Projectile(pos, round, enemies, player.damageMultiplier);
		projectile.velocity = {
			x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180),
			y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180)
		}
		projectile.stats.damageMultiplier = player.damageMultiplier;
	},
	new Image() 		// Sprite
)
mazerBazooka.sprite.src = 'images/placeHolder_weapon.png';

const superShotgun = new Weapon( //type, stats, action
	"Ranged",			// Type
	{					// Stats
		round: superShotgunShot,
		fireRate: 15,
		cooldown: 0
	},
	(self) => {			// Action
		// Cooldown
		self.stats.cooldown = self.stats.fireRate;

		// Fire
		for (let i=0; i<20; i++) {
			let pos = {
				x: player.position.x,
				y: player.position.y,
				rotation: player.position.rotation + Math.floor(Math.random()*20 - 10)
			}
			let round = self.stats.round;
			let power = Math.floor(Math.random()*10+1) *0.1 + 1; 
			let projectile = new Projectile(pos, round, enemies, player.damageMultiplier);
			projectile.velocity = {
				x: round.stats.speed * Math.cos(projectile.position.rotation * Math.PI/180) * power,
				y: round.stats.speed * Math.sin(projectile.position.rotation * Math.PI/180) * power
			}
			projectile.stats.damageMultiplier = player.damageMultiplier;
		}

		// Audio
		let sfx = new Audio('audio/linearRifle_shot.mp3');
		sfx.play();
	},
	new Image() 		// Sprite
)
superShotgun.sprite.src = 'images/placeHolder_weapon.png';














	// Effects
const afterImage = { //{position, action, color}, size
	action: (self) => {
		if (self.color.a <= 0) self.isDestroyed = true;
		else self.color.a -= 0.1;
	},
	color: {
		r: 0,
		g: 200,
		b: 200,
		a: 1
	}
}

const trail = { //{position, action, color}, size
	action: (self) => {
		if (self.color.a <= 0) self.isDestroyed = true;
		else {
			self.size.radius *= 0.95;
			self.color.a -= 0.05;
		}
	},
	color: {
		r: 255,
		g: 255,
		b: 255,
		a: 1
	}
}

const blood = { //{position, action, color}, size
	action: (self) => {
		if (self.velocity.x != 0) {
			if (Math.abs(self.velocity.x) > 0.1) self.velocity.x *= drag*0.09;
			else self.velocity.x = 0;
		}
		if (self.velocity.y != 0) {
			if (Math.abs(self.velocity.y) > 0.1) self.velocity.y *= drag*0.09;
			else self.velocity.y = 0;
		}

		if (self.velocity.x + self.velocity.y === 0) self.isDestroyed = true;
	},
	color: 'red'
}

const sparks = { //{position, action, color}, size
	action: (self) => {
		if (self.velocity.x != 0) {
			if (Math.abs(self.velocity.x) > 0.1) self.velocity.x *= drag*0.09;
			else self.velocity.x = 0;
		}
		if (self.velocity.y != 0) {
			if (Math.abs(self.velocity.y) > 0.1) self.velocity.y *= drag*0.09;
			else self.velocity.y = 0;
		}

		if (self.velocity.x + self.velocity.y === 0) self.isDestroyed = true;
	},
	color: 'cyan'
}

const explosion = { //{position, action, color}, size
	action: (self) => {
		setTimeout( () => {
			self.isDestroyed = true;
		}, 200)
	},
	color: 'orange'
}

const electricity = { //{position, action, color}, size
	action: (self) => {},
	color: 'cyan',
	sprite: {
		img: null,
		spriteSheet: new Image(),
		fps: 60,
		size: {
			width: 500,
			height: 374
		},
		table: {
			rows: 1,
			cols: 26,
			totalFrames: 26,

			currentRow: 0,
			currentCol: 0
		}
	}
}
electricity.sprite.spriteSheet.src = 'images/electricity.png';
// for (let i=0; i<26; i++) {
// 	electricity.sprite.spriteSheet[i] = new Image();

// 	if (i < 10) electricity.sprite.spriteSheet[i].src = `images/electricity/frame_0${i}`;
// 	else electricity.sprite.spriteSheet[i].src = `images/electricity/frame_${i}`;
// }

















	// Player
const armoredGrinder = {
	size: {
		width: 30,
		height: 30
	},
	stats: {
		health: 20000,
		regen: 4,
		walkSpeed: 10,
		dashSpeed: 60
	},
	weapons: [
		linearRifle,
		missileLauncher,
		chainsawLauncher,
		assaultArmor
	],
	color: 'yellow'
}

const mechaKingKevlar = {
	size: {
		width: 60,
		height: 60
	},
	stats: {
		health: 30000,
		regen: 4,
		walkSpeed: 5,
		dashSpeed: 70
	},
	weapons: [
		linearRifle,
		mazerBazooka,
		chainsawLauncher,
		assaultArmor
	],
	color: 'silver'
}




const player = new Player( armoredGrinder );

















// Animation Frames
function animate() {
	requestAnimationFrame(animate);
	c.clearRect(player.position.x-canvas_width*0.5, player.position.y-canvas_height*0.5, canvas_width, canvas_height);


	// Inputs
		// Movement
	if (keys.w.pressed || keys.a.pressed || keys.s.pressed || keys.d.pressed) player.move();
	else player.isMoving = false;

		// Attacks
	if (keys.mouseL.pressed) player.attack(0);
	if (keys.mouseR.pressed) player.attack(1);
	if (keys.mouseB.pressed) player.attack(2);
	if (keys.mouseM.pressed) player.attack(3);

		// Features
	if (keys.shiftL.pressed) player.dash();


	// Updates
	if (enemies.obj.length > 0) for (let i in enemies.obj) {
		enemies.obj[i].update();
	}
	if (effects.obj.length > 0) for (let i in effects.obj) {
		effects.obj[i].update();
	}
	if (projectiles.obj.length > 0) for (let i in projectiles.obj) {
		projectiles.obj[i].update();
	}
	player.update();

	drawScore();
	drawHealth();
	drawCooldown();


	// Summon Enemy
	pickEvent();
	summonEnemy();

	// Test
	
	//console.log(player.position.x, player.position.y)
	//console.log();
}
animate();

















// Functions
function drawReticle(e) {
	u.clearRect(0, 0, canvas_width, canvas_height);
	let pointX = e.x - ui.getBoundingClientRect().left;
	let pointY = e.y - ui.getBoundingClientRect().top;
	
	// u.strokeStyle = 'silver';
	// u.beginPath();
	// u.arc(pointX, pointY, 10, 0, Math.PI*2, false);
	// u.stroke();
	// u.closePath();

	u.save();
	u.translate(pointX, pointY);
	u.drawImage(reticle, 0, 0, 512, 512, -30, -30, 80, 80)
	u.restore();
}

function aim(self, target, eIsMouse=false) {
	// Fail Safe (Same Position)
	if (!eIsMouse && self.position.x == target.position.x && self.position.y == target.position.y) return self.position.rotation;

	// Variables
	let posX = self.position.x;
	let posY = self.position.y;
	let pointX;
	let pointY;

	if (eIsMouse) {	// Player Exclusive
		pointX = target.x - ui.getBoundingClientRect().left - translated.x;
		pointY = target.y - ui.getBoundingClientRect().top - translated.y;
	}
	else {			// Non-Exclusive
		pointX = target.position.x;
		pointY = target.position.y;
	}

	let rot = Math.atan((pointY-posY)/(pointX-posX)) * 180/Math.PI;
	if (pointX < posX) rot += 180;
	return rot;
}

function rectangularCollision(object1, object2) {
	if (object2 === player && player.isInvincible) return false;

	return (
		((object1.position.x+object1.size.width*0.5 >= object2.position.x-object2.size.width*0.5) &&
		(object1.position.y+object1.size.height*0.5 >= object2.position.y-object2.size.height*0.5))
		&&
		((object2.position.x+object2.size.width*0.5 >= object1.position.x-object1.size.width*0.5) &&
		(object2.position.y+object2.size.height*0.5 >= object1.position.y-object1.size.height*0.5))
	)
}

function complexRectangularCollision(object1, object2) {
	let r1 = Math.sqrt(object1.size.width**2 + object1.size.height**2)*0.5;
	let r2 = Math.sqrt(object2.size.width**2 + object2.size.height**2)*0.5;
	let rot1 = object1.position.rotation;
	let rot2 = object2.position.rotation;

	let x1 = [0, 0, 0, 0];
	let y1 = [0, 0, 0, 0];
	let x2 = [0, 0, 0, 0];
	let y2 = [0, 0, 0, 0];

	// Object 1
	x1[0] = object1.position.x + r1*Math.cos((rot1 - 135) * Math.PI/180);
	x1[1] = object1.position.x + r1*Math.cos((rot1 - 45) * Math.PI/180);
	x1[2] = object1.position.x + r1*Math.cos((rot1 + 45) * Math.PI/180);
	x1[3] = object1.position.x + r1*Math.cos((rot1 + 135) * Math.PI/180);

	y1[0] = object1.position.y + r1*Math.sin((rot1 - 135) * Math.PI/180);
	y1[1] = object1.position.y + r1*Math.sin((rot1 - 45) * Math.PI/180);
	y1[2] = object1.position.y + r1*Math.sin((rot1 + 45) * Math.PI/180);
	y1[3] = object1.position.y + r1*Math.sin((rot1 + 135) * Math.PI/180);

	// Object 2
	x2[0] = object2.position.x + r2*Math.cos((rot2 - 135) * Math.PI/180);
	x2[1] = object2.position.x + r2*Math.cos((rot2 - 45) * Math.PI/180);
	x2[2] = object2.position.x + r2*Math.cos((rot2 + 45) * Math.PI/180);
	x2[3] = object2.position.x + r2*Math.cos((rot2 + 135) * Math.PI/180);

	y2[0] = object2.position.y + r2*Math.sin((rot1 - 135) * Math.PI/180);
	y2[1] = object2.position.y + r2*Math.sin((rot1 - 45) * Math.PI/180);
	y2[2] = object2.position.y + r2*Math.sin((rot1 + 45) * Math.PI/180);
	y2[3] = object2.position.y + r2*Math.sin((rot1 + 135) * Math.PI/180);

	// Min & Max
		// Object 1
	let x1_max = x1[0];
	let x1_min = x1[0];
	let y1_max = y1[0];
	let y1_min = y1[0];

		// Object 2
	let x2_max = x2[0];
	let x2_min = x2[0];
	let y2_max = y2[0];
	let y2_min = y2[0];

	for (let i=0; i<4; i++) {
			// Object 1
		if (x1_max < x1[i]) x1_max = x1[i];
		else if (x1_min > x1[i]) x1_min = x1[i];

		if (y1_max < y1[i]) y1_max = y1[i];
		else if (y1_min > y1[i]) y1_min = y1[i];

			// Object 2
		if (x2_max < x2[i]) x2_max = x2[i];
		else if (x2_min > x2[i]) x2_min = x2[i];

		if (y2_max < y2[i]) y2_max = y2[i];
		else if (y2_min > y2[i]) y2_min = y2[i];
	}

	// Collision
	let resultX = false;
	let resultY = false;

	if ( (x1_max > x2_min && x1_min < x2_min) || (x2_max > x1_min && x2_min < x1_min) ) resultX = true;
	if ( (y1_max > y2_min && y1_min < y2_min) || (y2_max > y1_min && y2_min < y1_min) ) resultY = true;
	return (resultX && resultY)
}

function getDistance(object1, object2) {
	return ((object1.position.x-object2.position.x)**2 + (object1.position.y-object2.position.y)**2)**0.5;
}

function getPlayerDirection() {
	let rotX = null;
	let rotY = null;
	let rot = 0;

	if (keys.w.pressed && player.lastKey.y == 'w') rotY = -90;
	if (keys.a.pressed && player.lastKey.x == 'a') rotX = -180;
	if (keys.s.pressed && player.lastKey.y == 's') rotY = 90;
	if (keys.d.pressed && player.lastKey.x == 'd') rotX = 0;

	if (rotX == null && rotY == null) return null;
	if (rotX == null && rotY != null) rotX = rotY;
	if (rotY == null && rotX != null) rotY = rotX;

	rot = (rotX + rotY) * 0.5;
	if (rotX == -180 && rotY == 90) rot = 135;
	return rot;
}

function drawHealth() {
	// Health Status
	if (player.displayShow) {
		let message = '';
		c.font = 'bold 25px Helvetica';

		if (player.health <= 0) {
			c.fillStyle = 'red';
			c.font = 'bold 35px Helvetica';
			message = 'CRITICAL SYSTEM FAILURE';
			player.displayInterval = 10;
		}
		else if (player.health < player.maxHealth*0.2) {
			c.fillStyle = 'red';
			message = 'Health Dangerously Low';
		}
		else if (player.health < player.maxHealth*0.5) {
			c.fillStyle = 'orange';
			message = 'Health Below 50%';
		}

		if (player.isDestroyed) {
			c.fillStyle = 'red';
			c.font = 'bold 45px Helvetica';
			message = 'You Are Dead';
			player.displayInterval = 40;
		}

		c.fillText(message, canvas_width*0.5 - translated.x, canvas_height - 110 - translated.y);
	}
	
	// Display Interval
	if (player.displayTime > 0) player.displayTime--;
	else {
		player.displayTime = player.displayInterval;
		player.displayShow = !player.displayShow;
	}

	// Stability
	if (player.health < 0) return;
	if (player.isStable) c.fillStyle = 'lightgrey';
	else c.fillStyle = 'grey';

	c.save();
	c.translate(canvas_width*0.5 - translated.x, canvas_height-70 - translated.y);
	c.fillRect(-player.stability/player.maxStability * 500, -25, player.stability/player.maxStability * 1000, 40);
	c.restore();

	// Speed
	c.save();
	c.fillStyle = 'white';
	c.translate(canvas_width - 100 - translated.x, canvas_height-70 - translated.y);
	c.font = '30px Helvetica';
	c.fillText(`${Math.round(Math.sqrt(player.velocity.x**2 + player.velocity.y**2), 2) * 10} KM/H`, 0, 0)
	c.restore();
}

function drawCooldown() {
	if (player.isDestroyed) return;
	for (let i in player.weapons) {
		let weapon = player.weapons[i];
		let posX = canvas_width - 50 - translated.x;
		let posY = canvas_height*0.5 + 100 - translated.y;
		
		let length = 50;

		c.save();
		if (weapon.stats.cooldown > weapon.stats.fireRate*0.4) c.fillStyle = 'red';
		else if (weapon.stats.cooldown) c.fillStyle = 'orange';
		else c.fillStyle = 'springGreen';
		c.translate(posX, posY + length*i);
		c.drawImage(weapon.sprite, 0, 0, 512, 512, -50, -50, 100, 100);
		c.fillRect(-60, -35, -150 + 150 * weapon.stats.cooldown/weapon.stats.fireRate, 10);
		c.restore();
	}
}

function drawScore() {
	// Transfer Score
	if (!player.isDestroyed) player.score = player.storedScore;

	// Calculate Score
	let difference = player.score - player.scoreDisplay;
	switch (true) {
		case (difference === 0):
			break;
		case (difference <= 10):
			player.scoreDisplay++;
			break;
		case (difference <= 100):
			player.scoreDisplay += 10;
			break;
		case (difference <= 1000):
			player.scoreDisplay += 100;
			break;
		default:
			player.scoreDisplay += 1000;
	}

	// Draw
	c.fillStyle = 'white';
	c.textAlign = 'center';

	// Score Name
	c.font = '30px Helvetica';
	c.fillText('Score', canvas_width*0.5 - translated.x, 40 - translated.y);

	// Score Value
	c.font = '15px Helvetica';
	c.fillText(player.scoreDisplay, canvas_width*0.5 - translated.x, 60 - translated.y);
}

function freezeFrame(duration=40, shake=true, shakeDuration=1200) {
	freezeFrames = duration;
	if (shake) screenShake(shakeDuration);
}

function screenShake(duration=40, strength=16) {
	//if (isShaking) {
	//	if (duration < shaking_duration)
	//	if (strength < isShaking_strength)
	//}
	// WIP

	// Old Shake
	if (strength < isShaking_strength) return;

	// New Shake
	isShaking = true;
	isShaking_strength = strength;
	isShaking_duration = duration;

	let ran1;
	let ran2;

	let shake = setInterval( () => {
		ran1 = Math.random()*strength - strength/2;
		ran2 = Math.random()*strength - strength/2;
		c.translate(ran1, ran2);

		setTimeout( () => {
			c.translate(-ran1, -ran2);
		}, 1)
	}, 16)
	setTimeout( () => {
		clearInterval(shake);
		isShaking = false;
		isShaking_strength = 0;
		isShaking_duration = 0;
	}, duration);
}

function pickEvent() {
	if (changeEvent === 0 && enemies.s.length === 0) {
		changeEvent = 40000 * 60/1000;	// Expressed in miliseconds

		eventIndex = Math.floor(Math.random()*spawnEvents.length);
		spawnCap.l = spawnEvents[eventIndex][0][ spawnEvents[eventIndex][0].length-1 ];
		spawnCap.g = spawnEvents[eventIndex][1][ spawnEvents[eventIndex][1].length-1 ];
	}
	else if (changeEvent === 0) {
		changeEvent = 40000 * 60/1000;	// Expressed in miliseconds
		let spawnEvents2 = [];
		for (let i in enemies.s) {
			spawnEvents2[i] = enemies.s[i].event;
			supremeIndex = i;
		}

		eventIndex = Math.floor(Math.random()*spawnEvents2.length);
		spawnCap.l = spawnEvents2[eventIndex][0][ spawnEvents2[eventIndex][0].length-1 ];
		spawnCap.g = spawnEvents2[eventIndex][1][ spawnEvents2[eventIndex][1].length-1 ];
	}
	else changeEvent--;
}

function summonEnemy() {
	let spawner = spawnEvents[eventIndex];
	if (enemies.s.length) spawner = enemies.s[supremeIndex].event;

	// Lesser Demons
	if (enemies.l < spawnCap.l) {
		let types = spawner[0].length - 1;
		let index = Math.floor(Math.random() * types);

		let ran1;
		let ran2;

		

		if (Math.floor(Math.random()*2)) ran1 = 1;
		else ran1 = -1;
		if (Math.floor(Math.random()*2)) ran2 = 1;
		else ran2 = -1;

		let pos = {
			x: Math.floor(Math.random() * canvas_width) - translated.x + (canvas_width*ran1),
			y: Math.floor(Math.random() * canvas_height) - translated.y + (canvas_height*ran2),
			rotation: 50
		}
		pos.rotation = Math.floor(aim({position: {x: pos.x, y:pos.y, rotation: 0}}, player));

		let enemy = new Minion(pos, spawner[0][index]);
	}
	
	// Greater Demons
	if (enemies.g < spawnCap.g) {
		let types = spawner[1].length - 1;
		let index = Math.floor(Math.random() * types);

		let ran1;
		let ran2;

		if (Math.floor(Math.random()*2)) ran1 = 1;
		else ran1 = -1;
		if (Math.floor(Math.random()*2)) ran2 = 1;
		else ran2 = -1;

		let pos = {
			x: Math.floor(Math.random() * canvas_width) - translated.x + (canvas_width*ran1),
			y: Math.floor(Math.random() * canvas_height) - translated.y + (canvas_height*ran2),
			rotation: 0
		}

		let enemy = new Minion(pos, spawner[1][index]);
	}
}
























// Input Handlers
document.addEventListener('keydown', (e) => {
	e.preventDefault();
	// Fullscreen
	if (e.code == 'Tab' && !document.fullscreenElement) document.getElementById('game').requestFullscreen();
})





document.addEventListener('pointerdown', (e) => {
	switch (e.button) {
		case 0:
			keys.mouseL.pressed = true;
			break;
		case 1:
			keys.mouseM.pressed = true;
			break;
		case 2:
			keys.mouseR.pressed = true;
			break;
		case 3:
			keys.mouseB.pressed = true;
			break;
		case 4:
			keys.mouseF.pressed = true;
	}
})

document.addEventListener('pointerup', (e) => {
	switch (e.button) {
		case 0:
			keys.mouseL.pressed = false;
			break;
		case 1:
			keys.mouseM.pressed = false;
			break;
		case 2:
			keys.mouseR.pressed = false;
			break;
		case 3:
			keys.mouseB.pressed = false;
			break;
		case 4:
			keys.mouseF.pressed = false;
	}
})

document.addEventListener('keydown', (e) => {
	switch (e.code) {
			// Movement
		case 'KeyW':
			keys.w.pressed = true;
			player.lastKey.y = 'w';
			break;
		case 'KeyA':
			keys.a.pressed = true;
			player.lastKey.x = 'a';
			break;
		case 'KeyS':
			keys.s.pressed = true;
			player.lastKey.y = 's';
			break;
		case 'KeyD':
			keys.d.pressed = true;
			player.lastKey.x = 'd';
			break;

			// Features
		case 'ShiftLeft':
			keys.shiftL.pressed = true;
			break;

			// Attacks
		case 'Space':
			keys.space.pressed = true;
	}
})

document.addEventListener('keyup', (e) => {
	switch (e.code) {
			// Movement
		case 'KeyW':
			keys.w.pressed = false;
			break;
		case 'KeyA':
			keys.a.pressed = false;
			break;
		case 'KeyS':
			keys.s.pressed = false;
			break;
		case 'KeyD':
			keys.d.pressed = false;

			// Features
		case 'ShiftLeft':
			keys.shiftL.pressed = false;
			break;

			// Attacks
		case 'Space':
			keys.space.pressed = false;
	}
})

document.addEventListener('mousemove', (e) => {
	drawReticle(e);
	if (player.isDestroyed) return
	player.position.rotation = aim(player, e, true);
})





// Boss After Set Time
let test;
setTimeout( () => {
	test = new Boss({x:-200, y:-200, rotation:0}, ratMage);
}, 60000)
