



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
let translated = {x: 0, y: 0};
let eventIndex;
let changeEvent = 0;
let spawnCap;
let freezeFrames = 0;
keys = {
	// Movement
	w: {pressed: false},
	a: {pressed: false},
	s: {pressed: false},
	d: {pressed: false},

	// Attacks
	mouseL: {pressed: false},
	mouseR: {pressed: false},

	// Features
	shiftL: {pressed: false}
}

	// Object Containers
let enemies = {obj: []};
let projectiles = {obj: []};
let effects = {obj: []};









































// Classes
class Effect {
	constructor(position, size, {action, color}) {
		this.position = position;
		this.velocity = {x:0, y:0};
		this.acceleration = {x:0, y:0};
		this.color = color;
		this.action = action;
		this.size = size;
		this.isDestroyed = false;
		effects.obj.push(this);
	}

	draw() {
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
	constructor(size, stats, weapons, color) {
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
		this.scoreDisplay = 0;
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
		if (this.isDashing) return;
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
		c.translate(-this.velocity.x, -this.velocity.y);
		translated.x -= this.velocity.x;
		translated.y -= this.velocity.y;
		this.position.x += this.velocity.x;
		this.position.y += this.velocity.y;
		this.velocity.x += this.acceleration.x * 0.01;
		this.velocity.y += this.acceleration.y * 0.01;

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
		if (this.isStable) {
			this.stability -= damage * damageMultiplier * this.damageTakenMultipler;
			this.health -= damage * damageMultiplier * this.damageTakenMultipler * 0.1;
		}
		else this.health -= damage * damageMultiplier * this.damageTakenMultipler;

		// Spark Effects
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
			let shadow = new Effect(pos, s, sparks);
			
			shadow.velocity.x = splatterStrength * Math.cos(angle2 * Math.PI/180);
			shadow.velocity.y = splatterStrength * Math.sin(angle2 * Math.PI/180);
		}, 5)
		setTimeout( () => {
			clearInterval(squirt);
		}, 100)

		// Explosion Effects
		if (!this.isStable) {
			let randS = Math.floor(Math.random()*19) + 1;
			let angle2 = angle + Math.floor(Math.random()*80) - 40;

			let pos = {
				x: this.position.x + Math.floor(Math.random()*30) - 15,
				y: this.position.y + Math.floor(Math.random()*30) - 15,
				rotation: 0,
			}
			let s = {
				width: 0,
				height: 0,
				radius: randS
			}
			let shadow = new Effect(pos, s, explosion);
			screenShake(10, 16);
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

		// Temporary Death
		if (this.health <= 0) alert(`You Died Lmao, Score: ${this.score}`);
	}

	attack(index) {
		if (this.weapons[index].stats.cooldown == 0) this.weapons[index].action(this.weapons[index]);
	}

	weaponCD() {
		for (let i in this.weapons) {
			if (this.weapons[i].stats.cooldown > 0) this.weapons[i].stats.cooldown--;
		}
	}

	update() {
		this.weaponCD();
		this.statesHandling();
		this.vectors();
		this.draw();
	}
}














class Minion {
	constructor(position, {size, genStats, stats=null, behavior, attacks, death, color}) {
		this.position = position;
		this.size = size;
		this.velocity = {x: 0, y: 0};
		this.acceleration = {x: 0, y: 0};

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
			player.score += this.score;

			// Blood Effects
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
		}

		if (this.isDestroyed) {
			for (let i in enemies.obj) {
				if (enemies.obj[i] === this) enemies.obj.splice(i, 1);
			}
			this.death(this);
		}
	}

	update() {
		this.behavior(this);
		this.vectors();
		this.autoDelete();
		this.draw();
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
	}
}

















class Weapon {
	constructor(type, stats, action) {
		this.type = type;
		this.stats = stats;
		this.action = action;
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

const imp = {
	size: {
		width: 40,
		height: 40,
		radius: 0
	},
	genStats: {
		health: 200,
		walkSpeed: 10,
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

		if (rot > 180 && direction < 0) rot -= 360;
		if (rot < 0 && direction > 180) rot += 360;

		if (direction > rot) turn = self.stats.turnSpeed;
		else if (direction < rot) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction-rot) < self.stats.turnSpeed) self.position.rotation = direction

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
	genStats: {
		health: 2000,
		walkSpeed: 5,
		fireRate: 0,
		cooldown: 0,
		score: 100,
		extra: 0
	},
	stats: {
		damage: 40,
		turnSpeed: 2
	},
	behavior: (self) => {
		self.isMoving = true;
		// Direction
		let rot = self.position.rotation;
		let direction = aim(self, player);
		let turn;

		if (rot > 180 && direction < 0) rot -= 360;
		if (rot < 0 && direction > 180) rot += 360;

		if (direction > rot) turn = self.stats.turnSpeed;
		else if (direction < rot) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction-rot) < self.stats.turnSpeed) self.position.rotation = direction;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180);

		// Spacing
		for (let i in enemies.obj) if (enemies.obj[i] != self && getDistance(self, enemies.obj[i]) < 200) {
			let other = enemies.obj[i];
			let distance = getDistance(self, other);
			let angle = aim(self, other);
			self.velocity.x += self.walkSpeed * Math.cos(-angle * Math.PI/180) * (200-distance) * 0.01;
			self.velocity.y += self.walkSpeed * Math.sin(-angle * Math.PI/180) * (200-distance) * 0.01;
		}

		// Attack
		if (rectangularCollision(player, self)) self.attacks(self, 0);
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
	genStats: {
		health: 200,
		walkSpeed: 0,
		fireRate: 50,
		cooldown: 0,
		score: 30,
		extra: 0
	},
	stats: {
		damage: 0,
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

		if (rot > 180 && direction < 0) rot -= 360;
		if (rot < 0 && direction > 180) rot += 360;

		if (direction > rot) turn = self.stats.turnSpeed;
		else if (direction < rot) turn = -self.stats.turnSpeed;
		self.extra += turn;
		if (Math.abs(direction-rot) < self.stats.turnSpeed) self.extra = direction;

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
	genStats: {
		health: 1000,
		walkSpeed: 5,
		fireRate: 0,
		cooldown: 0,
		score: 40,
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

		if (rot > 180 && direction < 0) rot -= 360;
		if (rot < 0 && direction > 180) rot += 360;

		if (direction > rot) turn = self.stats.turnSpeed;
		else if (direction < rot) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction-rot) < self.stats.turnSpeed) self.position.rotation = direction;

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
	},
	death: (self) => {self.attacks(self, 0)},
	color: 'orange'
}

const ghoul = {
	size: {
		width: 50,
		height: 50,
		radius: 0
	},
	genStats: {
		health: 400,
		walkSpeed: 52,
		fireRate: 100,
		cooldown: 10,
		score: 40,
		extra: 0
	},
	stats: {
		damage: 200,
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
		if (rectangularCollision(self, player) && self.velocity.x != 0 && self.velocity.y != 0) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		// Damage
		player.tookDamage(self.stats.damage, self.damageMultiplier, self.position.rotation);
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
	genStats: {
		health: 10,
		walkSpeed: 10,
		fireRate: 0,
		cooldown: 0,
		score: 40,
		extra: 0
	},
	stats: {
		damage: 0,
		range: 250,
		error: 50,
		turnSpeed: 3,
	},
	behavior: (self) => {
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

		if (rot > 180 && direction < 0) rot -= 360;
		if (rot < 0 && direction > 180) rot += 360;

		if (direction > rot) turn = self.stats.turnSpeed;
		else if (direction < rot) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction-rot) < self.stats.turnSpeed) self.position.rotation = direction;

		// Movement
		self.velocity.x = self.walkSpeed * Math.cos(self.position.rotation * Math.PI/180) + player.velocity.x;
		self.velocity.y = self.walkSpeed * Math.sin(self.position.rotation * Math.PI/180) + player.velocity.y;

		// Summon Ghoul
		if (getDistance(self, target) <= self.stats.error) self.attacks(self, 0);
	},
	attacks: (self, index) => {
		let pos = {
			x: self.position.x,
			y: self.position.y,
			rotation: 0,
		}
		let trans = new Minion(pos, ghoul);
		self.isDestroyed = true;
	},
	death: (self) => {},
	color: 'grey'
}

const enemyTypes = [imp, wall, wretchedSoul, gargoyle, tortoise, ghoul, vampireBat, 25];

const impsOnAMineField_spawn = [imp, imp, imp, imp, tortoise, 25];
const classic_spawn = [imp, imp, wall, wretchedSoul, 25];
const toxicWalls_spawn = [imp, wall, wretchedSoul, gargoyle, 20];
const explosiveWalls_spawn = [imp, imp, imp, imp, wall, wall, tortoise, 30];
const explosiveToxins_spawn = [imp, imp, gargoyle, gargoyle, tortoise, 20];
const spooky_spawn = [imp, imp, gargoyle, vampireBat, 20];

const spawnEvents = [impsOnAMineField_spawn, classic_spawn, toxicWalls_spawn, explosiveWalls_spawn, explosiveToxins_spawn, spooky_spawn];



































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
		damage: 100,
		speed: 25,
		damageMultiplier: 1
	},
	action: (self) => {
		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) {
				self.attack(self, target);
				self.isDestroyed = true;
			}
		}
	},
	attack: (self, target) => {
		target.tookDamage(self.stats.damage, self.stats.damageMultiplier, self.position.rotation);
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
		turnSpeed: 10,
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
			if (getDistance(self, self.targets.obj[i]) < getDistance(self, target)) {
				target = self.targets.obj[i];
			}
		}
		direction = aim(self, target);

		if (rot > 180 && direction < 0) rot -= 360;
		if (rot < 0 && direction > 180) rot += 360;

		if (direction > rot) turn = self.stats.turnSpeed;
		else if (direction < rot) turn = -self.stats.turnSpeed;
		self.position.rotation += turn;
		if (Math.abs(direction-rot) < self.stats.turnSpeed) self.position.rotation = direction;

		// Movement
		self.velocity.x = self.stats.speed * Math.cos(self.position.rotation * Math.PI/180);
		self.velocity.y = self.stats.speed * Math.sin(self.position.rotation * Math.PI/180);

		// Hit
		for (let i in self.targets.obj) {
			let target = self.targets.obj[i];
			if (rectangularCollision(self, target)) {
				self.attack(self, target);
				self.isDestroyed = true;
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





























	// Weapons
const linearRifle = new Weapon( //type, stats, action
	"Ranged",		// Type
	{				// Stats
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
	}
)

const missileLauncher = new Weapon( //type, stats, action
	"Ranged",		// Type
	{				// Stats
		round: missile,
		fireRate: 200,
		cooldown: 0
	},
	(self) => {			// Action
		// Cooldown
		self.stats.cooldown = self.stats.fireRate;

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
		}, 80)

		setTimeout( () => {
			clearInterval(fire);
		}, 1000)
	}
)












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


















	// Player
const player = new Player(
	{	// Size
		width: 30,
		height: 30
	},
	{	// Stats
		health: 10000,
		regen: 4,
		walkSpeed: 10,
		dashSpeed: 60
	},
	[
		linearRifle,
		missileLauncher
	],	// Weapons
	'yellow'
);




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
	
	u.strokeStyle = 'silver';
	u.beginPath();
	u.arc(pointX, pointY, 10, 0, Math.PI*2, false);
	u.stroke();
	u.closePath();
}

function aim(self, target, eIsMouse=false) {
	let posX = self.position.x;
	let posY = self.position.y;
	let pointX;
	let pointY;

	if (eIsMouse) {
		pointX = target.x - ui.getBoundingClientRect().left - translated.x;
		pointY = target.y - ui.getBoundingClientRect().top - translated.y;
	}
	else {
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

// function complexRectangularCollision(object1, object2) {
// 	let l_1 = Math.sqrt(object1.size.width**2 + object1.size.height**2);
// 	let l_2 = Math.sqrt(object2.size.width**2 + object2.size.height**2);

// 	let x1 = [0, 0, 0, 0];
// 	let y1 = [0, 0, 0, 0];
// 	let x2 = [0, 0, 0, 0];
// 	let y2 = [0, 0, 0, 0];

// 	x1[0] = object1.position.x + object1.size.width*0.5 + (l_1*Math.sin(object1.position.rotation));
// 	x1[1] = object1.position.x - object1.size.width*0.5 + (l_1*Math.sin(object1.position.rotation));
// 	x1[2] = x1[1];
// 	x1[3] = x1[0];
// }

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
	// Stability
	if (player.isStable) c.fillStyle = 'lightgrey';
	else c.fillStyle = 'grey';

	c.save();
	c.translate(canvas_width*0.5 - translated.x, canvas_height-70 - translated.y);
	c.fillRect(-player.stability/player.maxStability * 500, -25, player.stability/player.maxStability * 1000, 40);
	c.restore();

	// Health Status
	if (player.health < player.maxHealth*0.2) {
		c.fillStyle = 'red';
		c.textAlign = 'center';
		c.font = 'bold 25px Helvetica';
		c.fillText('Dangerously Low', canvas_width*0.5 - translated.x, canvas_height - 100 - translated.y);
	}
	else if (player.health < player.maxHealth*0.5) {
		c.fillStyle = 'orange';
		c.textAlign = 'center';
		c.font = 'bold 25px Helvetica';
		c.fillText('Health Less Than 50%', canvas_width*0.5 - translated.x, canvas_height - 100 - translated.y);
	}
}

function drawScore() {
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

function screenShake(duration=32, strength=16) {
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
	}, duration);
}

function pickEvent() {
	if (changeEvent === 0) {
		changeEvent = 5000;

		eventIndex = Math.floor(Math.random()*spawnEvents.length);
		spawnCap = spawnEvents[eventIndex][ spawnEvents[eventIndex].length-1 ];
	}
	else changeEvent--;
}

function summonEnemy() {
	if (enemies.obj.length > spawnCap) return;

	let types = spawnEvents[eventIndex].length - 1;
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

	let enemy = new Minion(pos, spawnEvents[eventIndex][index]);
}
























// Input Handlers
document.addEventListener('keydown', (e) => {
	e.preventDefault();
	// Fullscreen
	if (e.code == 'Tab' && !document.fullscreenElement) document.getElementById('game').requestFullscreen();
})





document.addEventListener('pointerdown', (e) => {
	switch (e.which) {
		case 1:
			keys.mouseL.pressed = true;
			break;
		case 3:
			keys.mouseR.pressed = true;
	}
})

document.addEventListener('pointerup', (e) => {
	switch (e.which) {
		case 1:
			keys.mouseL.pressed = false;
			break;
		case 3:
			keys.mouseR.pressed = false;
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
	}
})

document.addEventListener('mousemove', (e) => {
	drawReticle(e);
	player.position.rotation = aim(player, e, true);
})