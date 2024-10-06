// Game constants
const TOTAL_PADDLES = 10;
const COUNTDOWN_TIME = 3;
const POWERUP_INTERVAL = 10000; // 10 seconds
const POWERUP_CHANCE = 0.0; // 0% chance

class Player {
    constructor(id, color, upKey, downKey) {
        this.id = id;
        this.color = color;
        this.upKey = upKey;
        this.downKey = downKey;
        this.score = TOTAL_PADDLES / 2;
        this.y = 0;
        this.paddleHeight = 0;
        this.gameStarted = false;
        this.powerups = []; // Array to store collected power-ups
    }

    updatePaddleHeight(canvasHeight) {
        this.paddleHeight = canvasHeight * (this.score / TOTAL_PADDLES) / 3;
    }

    move(direction, amount, minY, maxY) {
        this.y += direction * amount;
        this.y = Math.max(minY, Math.min(maxY, this.y));
    }
}

class Ball {
    constructor(ctx) {
        this.ctx = ctx;
        this.x = 0;
        this.y = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.size = 0;
        this.color = 'gray';
        this.player = null; // The player who last touched the ball
        this.lastCollisionTime = 0;
    }

    reset(canvasWidth, canvasHeight) {
        this.x = canvasWidth / 2;
        this.y = canvasHeight / 2;
        this.speedX = (Math.random() > 0.5 ? 1 : -1) * canvasWidth * 0.005;
        this.speedY = (Math.random() * 2 - 1) * canvasHeight * 0.003;
        this.color = 'gray';
        this.player = null;
    }

    move() {
        this.x += this.speedX;
        this.y += this.speedY;
    }

    reverseX() {
        this.speedX = -this.speedX;
        // Slightly adjust the ball's position to prevent sticking
        this.x += this.speedX > 0 ? 1 : -1;
    }

    reverseY() {
        this.speedY = -this.speedY;
        // Ensure there's always some vertical movement
        const minVerticalSpeed = Math.abs(this.speedX) * 0.2;
        if (Math.abs(this.speedY) < minVerticalSpeed) {
            this.speedY = this.speedY > 0 ? minVerticalSpeed : -minVerticalSpeed;
        }
        // Slightly adjust the ball's position to prevent sticking
        this.y += this.speedY > 0 ? 1 : -1;
    }

    updatePlayer(player) {
        this.player = player;
        this.color = player.color;
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

class PowerUp {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = 'yellow';
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class PppppongGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreBoard = document.getElementById('scoreBoard');
        this.gameContainer = document.getElementById('gameContainer');

        this.player1 = new Player('player_1', 'blue', 'w', 's');
        this.player2 = new Player('player_2', 'red', 'ArrowUp', 'ArrowDown');
        this.ball = new Ball(this.ctx);

        this.paddleWidth = 0;
        this.borderWidth = 0;
        this.wallHeight = 0;
        this.playAreaWidth = 0;
        this.paddleAreaWidth = 0;
        this.paddleXPositions = [];

        this.originalPaddleOwnership = Array(TOTAL_PADDLES).fill().map((_, index) => index % 2 === 0 ? this.player1 : this.player2);
        this.paddleOwnership = [...this.originalPaddleOwnership];

        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            w: false,
            s: false
        };

        this.gameStarted = false;
        this.countdownTimer = COUNTDOWN_TIME;
        this.lastScoreTime = 0;

        this.powerups = [];
        this.lastPowerUpTime = 0;

        this.resizeCanvas();
        this.addEventListeners();
    }

    resizeCanvas() {
        const containerStyle = window.getComputedStyle(this.gameContainer);
        const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
        const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);

        this.canvas.width = this.gameContainer.clientWidth - paddingX;
        this.canvas.height = this.gameContainer.clientHeight - this.scoreBoard.offsetHeight - paddingY;
        
        this.initializeGameDimensions();
        this.updateScoreboardStyle();

        this.drawGame();
    }

    drawGame() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBorders();
        this.drawPaddles();
        this.ball.draw();
        this.drawPowerUps();
        this.updateScore();
    }

    updateScoreboardStyle() {
        const fontSize = Math.min(this.canvas.width, this.canvas.height) * 0.03;
        this.scoreBoard.style.fontSize = `${fontSize}px`;
        this.scoreBoard.style.padding = `${fontSize / 2}px`;
    }

    initializeGameDimensions() {
        this.paddleWidth = this.canvas.width * 0.01;
        this.ball.size = Math.min(this.canvas.width, this.canvas.height) * 0.02;
        this.borderWidth = Math.min(this.canvas.width, this.canvas.height) * 0.01;
        this.wallHeight = this.canvas.height / 4;
        this.playAreaWidth = this.canvas.width - 2 * this.borderWidth;
        this.paddleAreaWidth = this.playAreaWidth * 0.6;

        this.ball.reset(this.canvas.width, this.canvas.height);
        this.player1.y = this.player2.y = this.canvas.height / 2;

        this.paddleXPositions = Array(TOTAL_PADDLES).fill().map((_, index) => {
            const paddleAreaStart = this.borderWidth + (this.playAreaWidth - this.paddleAreaWidth) / 2;
            return paddleAreaStart + index * (this.paddleAreaWidth / (TOTAL_PADDLES - 1));
        });

        this.player1.updatePaddleHeight(this.canvas.height);
        this.player2.updatePaddleHeight(this.canvas.height);
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('keyup', (event) => this.handleKeyUp(event));
    }

    handleKeyDown(event) {
        if (event.key in this.keys) {
            this.keys[event.key] = true;
        }
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.countdownTimer = COUNTDOWN_TIME;
            this.lastScoreTime = performance.now();
        }
    }

    handleKeyUp(event) {
        if (event.key in this.keys) {
            this.keys[event.key] = false;
        }
    }

    drawBorders() {
        this.ctx.fillStyle = 'gray';
        this.ctx.fillRect(0, 0, this.canvas.width, this.borderWidth);
        this.ctx.fillRect(0, (this.canvas.height - this.borderWidth), this.canvas.width, this.borderWidth);
        this.ctx.fillRect(0, 0, this.borderWidth, this.wallHeight);
        this.ctx.fillRect(0, this.canvas.height - this.wallHeight, this.borderWidth, this.wallHeight);
        this.ctx.fillRect(this.canvas.width - this.borderWidth, 0, this.borderWidth, this.wallHeight);
        this.ctx.fillRect(this.canvas.width - this.borderWidth, this.canvas.height - this.wallHeight, this.borderWidth, this.wallHeight);
    }

    drawPaddles() {
        for (let i = 0; i < TOTAL_PADDLES; i++) {
            const x = this.paddleXPositions[i];
            const player = this.paddleOwnership[i];
            this.ctx.fillStyle = player.color;
            this.ctx.fillRect(x - this.paddleWidth / 2, player.y - player.paddleHeight / 2, this.paddleWidth, player.paddleHeight);
        }
    }

    updateScore() {
        this.scoreBoard.textContent = `Player 1: ${this.player1.score} | Player 2: ${this.player2.score}`;
    }

    checkWallCollision() {
        let collision = false;
        
        // Top and bottom borders
        if (this.ball.y - this.ball.size / 2 <= this.borderWidth || 
            this.ball.y + this.ball.size / 2 >= this.canvas.height - this.borderWidth) {
            this.ball.reverseY();
            collision = true;
        }
        
        // Left and right walls
        if ((this.ball.x - this.ball.size / 2 <= this.borderWidth || 
             this.ball.x + this.ball.size / 2 >= this.canvas.width - this.borderWidth) && 
            (this.ball.y - this.ball.size / 2 < this.wallHeight || 
             this.ball.y + this.ball.size / 2 > this.canvas.height - this.wallHeight)) {
            this.ball.reverseX();
            collision = true;
        }

        // If a collision occurred, add a small random adjustment to prevent getting stuck in corners
        if (collision) {
            this.ball.speedX += (Math.random() - 0.5) * 0.5;
            this.ball.speedY += (Math.random() - 0.5) * 0.5;
            
            // Normalize speed to maintain consistent ball velocity
            const speed = Math.sqrt(this.ball.speedX * this.ball.speedX + this.ball.speedY * this.ball.speedY);
            const targetSpeed = Math.sqrt(this.canvas.width * this.canvas.width + this.canvas.height * this.canvas.height) * 0.005;
            const scaleFactor = targetSpeed / speed;
            this.ball.speedX *= scaleFactor;
            this.ball.speedY *= scaleFactor;
        }
    }

    transferPaddle(from, to) {
        if (from === to) return;
        const fromPaddles = this.paddleOwnership.filter(owner => owner === from);
        const toPaddles = this.paddleOwnership.filter(owner => owner === to);
        let paddleToTransfer;
        if (fromPaddles.length > 0 && toPaddles.length < 5) {
            if (to === this.player1) {
                paddleToTransfer = this.originalPaddleOwnership.lastIndexOf(this.player1);
                while (this.paddleOwnership[paddleToTransfer] === this.player1) {
                    paddleToTransfer = this.originalPaddleOwnership.lastIndexOf(this.player1, paddleToTransfer - 1);
                }
            } else {
                paddleToTransfer = this.originalPaddleOwnership.indexOf(this.player2);
                while (this.paddleOwnership[paddleToTransfer] === this.player2) {
                    paddleToTransfer = this.originalPaddleOwnership.indexOf(this.player2, paddleToTransfer + 1);
                }
            }
        } else {
            if (to === this.player1) {
                paddleToTransfer = this.paddleOwnership.indexOf(this.player2);
            } else {
                paddleToTransfer = this.paddleOwnership.lastIndexOf(this.player1);
            }
        }
        this.paddleOwnership[paddleToTransfer] = to;
    }

    updatePaddlePositions() {
        const paddleSpeed = this.canvas.height * 0.01;
        if (this.keys[this.player2.upKey]) this.player2.move(-1, paddleSpeed, this.borderWidth + this.player2.paddleHeight / 2, this.canvas.height - this.borderWidth - this.player2.paddleHeight / 2);
        if (this.keys[this.player2.downKey]) this.player2.move(1, paddleSpeed, this.borderWidth + this.player2.paddleHeight / 2, this.canvas.height - this.borderWidth - this.player2.paddleHeight / 2);
        if (this.keys[this.player1.upKey]) this.player1.move(-1, paddleSpeed, this.borderWidth + this.player1.paddleHeight / 2, this.canvas.height - this.borderWidth - this.player1.paddleHeight / 2);
        if (this.keys[this.player1.downKey]) this.player1.move(1, paddleSpeed, this.borderWidth + this.player1.paddleHeight / 2, this.canvas.height - this.borderWidth - this.player1.paddleHeight / 2);
    }

    resetPaddlePositions() {
        this.player1.y = this.player2.y = this.canvas.height / 2;
    }

    drawCountdown() {
        this.ctx.fillStyle = 'black';
        this.ctx.font = `${Math.min(this.canvas.width, this.canvas.height) * 0.06}px Arial`;
        this.ctx.textAlign = 'center';
        if (!this.gameStarted) {
            this.ctx.fillText('Press any key to start', this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.countdownTimer > 0) {
            this.ctx.fillText(this.countdownTimer, this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    resetGameState() {
        this.player1.score = this.player2.score = TOTAL_PADDLES / 2;
        this.paddleOwnership = [...this.originalPaddleOwnership];
        this.gameStarted = false;
        this.countdownTimer = COUNTDOWN_TIME;
        this.lastScoreTime = 0;
        this.ball.reset(this.canvas.width, this.canvas.height);
        this.resetPaddlePositions();
        this.player1.updatePaddleHeight(this.canvas.height);
        this.player2.updatePaddleHeight(this.canvas.height);
        this.powerups = [];
        this.lastPowerUpTime = 0;
        this.updateScore();
        this.drawGame();
    }

    generatePowerUp() {
        const size = this.ball.size;
        const x = Math.random() * (this.canvas.width - 2 * this.borderWidth - size) + this.borderWidth + size / 2;
        const y = Math.random() * (this.canvas.height - 2 * this.borderWidth - size) + this.borderWidth + size / 2;
        this.powerups.push(new PowerUp(x, y, size));
    }

    checkPowerUpCollision() {
        for (let i = 0; i < this.powerups.length; i++) {
            const powerup = this.powerups[i];
            const dx = this.ball.x - powerup.x;
            const dy = this.ball.y - powerup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (this.ball.size + powerup.size) / 2) {
                // Collision detected
                if (this.ball.player) {
                    this.ball.player.powerups.push(powerup);
                    console.log(`${this.ball.player.id} collected a power-up!`);
                }
                this.powerups.splice(i, 1);
                i--;
            }
        }
    }

    drawPowerUps() {
        for (const powerup of this.powerups) {
            powerup.draw(this.ctx);
        }
    }

    checkPaddleCollision() {
        const currentTime = performance.now();
        // Prevent multiple collisions in a short time frame
        if (currentTime - this.ball.lastCollisionTime < 50) return;

        for (let i = 0; i < TOTAL_PADDLES; i++) {
            const paddleX = this.paddleXPositions[i];
            const player = this.paddleOwnership[i];
            const paddleLeft = paddleX - this.paddleWidth / 2;
            const paddleRight = paddleX + this.paddleWidth / 2;
            const paddleTop = player.y - player.paddleHeight / 2;
            const paddleBottom = player.y + player.paddleHeight / 2;

            // Check if the ball is within the paddle's bounds
            if (this.ball.x + this.ball.size / 2 > paddleLeft &&
                this.ball.x - this.ball.size / 2 < paddleRight &&
                this.ball.y + this.ball.size / 2 > paddleTop &&
                this.ball.y - this.ball.size / 2 < paddleBottom) {

                // Calculate the collision point
                const collisionPoint = (this.ball.y - player.y) / (player.paddleHeight / 2);

                // Calculate new angle based on where the ball hit the paddle
                const angle = collisionPoint * (Math.PI / 4); // 45 degrees max angle

                // Set new velocities
                const speed = Math.sqrt(this.ball.speedX * this.ball.speedX + this.ball.speedY * this.ball.speedY);
                this.ball.speedX = this.ball.speedX > 0 ? -speed * Math.cos(angle) : speed * Math.cos(angle);
                this.ball.speedY = speed * Math.sin(angle);

                // Update ball color and player
                this.ball.updatePlayer(player);

                // Update last collision time
                this.ball.lastCollisionTime = currentTime;

                // Move the ball slightly to prevent sticking
                this.ball.x += this.ball.speedX > 0 ? 1 : -1;

                break;
            }
        }
    }

    update(currentTime) {
        if (!this.gameStarted) {
            this.drawCountdown();
            requestAnimationFrame((time) => this.update(time));
            return;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBorders();
        this.drawPaddles();
        this.updateScore();

        if (this.countdownTimer > 0) {
            if (currentTime - this.lastScoreTime >= 1000) {
                this.countdownTimer--;
                this.lastScoreTime = currentTime;
            }
            this.ball.draw();
            this.drawCountdown();
            requestAnimationFrame((time) => this.update(time));
            return;
        }

        // Power-up generation
        if (currentTime - this.lastPowerUpTime >= POWERUP_INTERVAL) {
            if (Math.random() < POWERUP_CHANCE) {
                this.generatePowerUp();
            }
            this.lastPowerUpTime = currentTime;
        }

        this.ball.move();
        this.checkWallCollision();
        this.checkPaddleCollision();
        this.checkPowerUpCollision();

        if (this.ball.x < 0 || this.ball.x > this.canvas.width) {
            if (this.ball.x < 0) {
                this.player2.score++;
                this.player1.score--;
                this.transferPaddle(this.player1, this.player2);
            } else {
                this.player1.score++;
                this.player2.score--;
                this.transferPaddle(this.player2, this.player1);
            }
            this.ball.reset(this.canvas.width, this.canvas.height);
            this.resetPaddlePositions();
            this.updateScore();
            this.countdownTimer = COUNTDOWN_TIME;
            this.lastScoreTime = currentTime;

            this.player1.updatePaddleHeight(this.canvas.height);
            this.player2.updatePaddleHeight(this.canvas.height);

            if (this.player1.score === TOTAL_PADDLES || this.player2.score === TOTAL_PADDLES) {
                alert(`Game Over! ${this.player1.score === TOTAL_PADDLES ? 'Player 1' : 'Player 2'} wins!`);
                this.resetGameState();
            }
        }

        this.updatePaddlePositions();
        this.ball.draw();
        this.drawPowerUps();

        requestAnimationFrame((time) => this.update(time));
    }

    start() {
        // Trigger a manual resize to ensure all dimensions are set correctly
        this.resizeCanvas();
        
        // Short delay to allow for any final rendering
        setTimeout(() => {
            this.resetGameState();
            this.update(performance.now());
        }, 50);
    }
}

// Start the game
const game = new PppppongGame();
game.start();