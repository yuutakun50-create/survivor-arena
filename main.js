        // ============================================
        // GAME CONFIGURATION
        // ============================================
        const CONFIG = {
            CANVAS_WIDTH: 900,
            CANVAS_HEIGHT: 650,
            
            // Player stats
            PLAYER_HP: 100,
            PLAYER_SPEED: 3,
            PLAYER_BASE_SPEED: 1.5, // Slightly faster than base enemy (1.2)
            PLAYER_RADIUS: 16,
            
            // Permanent upgrades (bought with coins)
            UPGRADE_COSTS: {
                damage: [100, 250, 500, 1000, 2000],
                maxHp: [150, 300, 600, 1200, 2500],
                defense: [200, 400, 800, 1500, 3000]
            },
            UPGRADE_VALUES: {
                damage: [0.15, 0.15, 0.2, 0.25, 0.3], // +15%, +15%, +20%, +25%, +30%
                maxHp: [25, 30, 40, 50, 75], // +25, +30, +40, +50, +75
                defense: [0.05, 0.05, 0.1, 0.1, 0.15] // -5%, -5%, -10%, -10%, -15% damage taken
            },
            
            // Wave system
            WAVE_DURATION: 1800, // 30 seconds per wave (at 60fps)
            BOSS_WAVE_INTERVAL: 5, // Boss every 5 waves
            WAVE_COMPLETION_HEAL: 0.3, // Heal 30% of max HP
            WAVE_COMPLETION_BONUS: 20, // Bonus coins per wave
            
            // NEW: Spawn RATE system (enemies per second)
            // Wave 1 = 1/sec, Wave 2 = 3/sec, Wave 3 = 5/sec
            BASE_SPAWN_RATE: 60, // Frames per spawn for wave 1 (1 per second)
            
            // NEW: Wave-based HP scaling
            ENEMY_HP_PER_WAVE: 1.2, // 20% more HP each wave
            
            // Critical hits
            CRIT_CHANCE: 0.15, // 15% chance
            CRIT_MULTIPLIER: 2.5, // 2.5x damage
            
            // Combo system
            COMBO_TIMEOUT: 180, // 3 seconds (at 60fps)
            COMBO_COIN_BONUS: 0.2, // 20% bonus coins per combo tier
            COMBO_TIERS: [5, 10, 20, 50, 100], // Kills needed for each tier
            
            // Coin system
            COIN_MAGNET_RADIUS: 120,
            BASE_COIN_DROP: 3,
            BOSS_COIN_MULTIPLIER: 10,
            WAVE_COIN_MULTIPLIER: 0.5, // Additional coins per wave
            
            // Enemy types and spawn weights by wave
            ENEMY_SPAWN_WEIGHTS: {
                1: { basic: 1.0, fast: 0, tank: 0 },
                3: { basic: 0.7, fast: 0.3, tank: 0 },
                6: { basic: 0.5, fast: 0.3, tank: 0.2 },
                10: { basic: 0.4, fast: 0.4, tank: 0.2 }
            },
            
            // Enemy scaling
            ENEMY_BASE_HP: 20,
            ENEMY_BASE_SPEED: 1.2,
            ENEMY_BASE_DAMAGE: 8,
            ENEMY_HP_SCALE: 1.15,      // HP multiplier per wave
            ENEMY_SPEED_SCALE: 1.05,   // Speed multiplier per wave
            ENEMY_DAMAGE_SCALE: 1.12,  // Damage multiplier per wave
            
            // Spawn rates (enemies per wave increases over time)
            BASE_ENEMIES_PER_WAVE: 10,
            ENEMIES_INCREASE_PER_WAVE: 3,
            SPAWN_INTERVAL_FRAMES: 60, // Frames between individual spawns
            
            // XP and leveling
            BASE_XP_TO_LEVEL: 100,
            XP_SCALE: 1.2,
            XP_MAGNET_RADIUS: 100,
            
            // Weapon cooldowns (in frames, 60fps)
            WEAPON_COOLDOWNS: {
                projectile: 45,
                lightning: 180,
                blade: 1,
                fireArea: 120,
                drone: 90
            }
        };

        // ============================================
        // GAME STATE
        // ============================================
        const game = {
            // Canvas
            canvas: document.getElementById('gameCanvas'),
            ctx: null,
            
            // Game state
            running: false,
            paused: false,
            gameTime: 0, // in frames
            
            // Wave system
            currentWave: 1,
            waveTimer: 0,
            spawnTimer: 0,
            currentSpawnInterval: 60, // Frames between spawns (dynamic per wave)
            
            // Entities
            player: null,
            enemies: [],
            projectiles: [],
            particles: [],
            xpOrbs: [],
            coins: [], // New: coin drops
            damageTexts: [], // Floating damage numbers
            
            // Stats
            enemiesKilled: 0,
            totalCoins: 0, // Total coins collected
            
            // Combo system
            comboCount: 0,
            comboTimer: 0,
            comboTier: 0,
            
            // Screen effects
            screenShake: 0,
            screenShakeIntensity: 0,
            
            // Permanent upgrades (persists between games)
            permanentUpgrades: {
                damage: 0, // Level 0-5
                maxHp: 0,  // Level 0-5
                defense: 0 // Level 0-5
            },
            
            // Total coins across all games (for shop)
            lifetimeCoins: 0,
            
            // Movement
            movement: {
                dx: 0,
                dy: 0,
                decay: 0.88
            },
            
            // Power-ups
            powerups: []
        };

        game.ctx = game.canvas.getContext('2d');
        
        // Load saved data from localStorage
        function loadGameData() {
            const saved = localStorage.getItem('survivorGameData');
            if (saved) {
                const data = JSON.parse(saved);
                game.permanentUpgrades = data.upgrades || { damage: 0, maxHp: 0, defense: 0 };
                game.lifetimeCoins = data.lifetimeCoins || 0;
            }
        }
        
        function saveGameData() {
            const data = {
                upgrades: game.permanentUpgrades,
                lifetimeCoins: game.lifetimeCoins
            };
            localStorage.setItem('survivorGameData', JSON.stringify(data));
        }
        
        loadGameData();

        // ============================================
        // SOUND SYSTEM
        // ============================================
        const sounds = {
            shoot: { freq: 400, duration: 0.1, type: 'square', volume: 0.1 },
            hit: { freq: 200, duration: 0.15, type: 'sawtooth', volume: 0.15 },
            coin: { freq: 800, duration: 0.1, type: 'sine', volume: 0.2 },
            xp: { freq: 600, duration: 0.1, type: 'sine', volume: 0.15 },
            levelup: { freq: 523, duration: 0.3, type: 'sine', volume: 0.25 },
            death: { freq: 100, duration: 0.5, type: 'sawtooth', volume: 0.2 },
            boss: { freq: 80, duration: 0.8, type: 'square', volume: 0.3 }
        };

        let audioContext = null;
        let soundEnabled = true;

        function initAudio() {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }

        function playSound(soundName) {
            if (!soundEnabled || !sounds[soundName]) return;
            
            initAudio();
            
            const sound = sounds[soundName];
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = sound.type;
            oscillator.frequency.value = sound.freq;
            
            gainNode.gain.setValueAtTime(sound.volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + sound.duration);
        }

        // ============================================
        // POWER-UP DEFINITIONS
        // ============================================
        const POWERUP_TYPES = {
            // Active Weapons
            projectile: {
                name: 'Magic Bolt',
                icon: '⚡',
                type: 'weapon',
                maxLevel: 8,
                description: 'Shoots projectiles at enemies',
                stats: { damage: 15, cooldown: 45, count: 1 },
                onUpgrade: (stats, level) => {
                    stats.damage += 5;
                    if (level % 2 === 0) stats.count++;
                    if (level >= 5) stats.cooldown = Math.max(20, stats.cooldown - 5);
                },
                evolutionRequires: 'attackBoost',
                evolvedForm: 'arcaneBarrage'
            },
            
            lightning: {
                name: 'Lightning Strike',
                icon: '⚡',
                type: 'weapon',
                maxLevel: 8,
                description: 'Calls down lightning bolts',
                stats: { damage: 40, cooldown: 180, count: 1, range: 200 },
                onUpgrade: (stats, level) => {
                    stats.damage += 10;
                    if (level % 2 === 0) stats.count++;
                    stats.cooldown = Math.max(90, stats.cooldown - 10);
                },
                evolutionRequires: 'cooldownBoost',
                evolvedForm: 'stormCaller'
            },
            
            blade: {
                name: 'Spinning Blade',
                icon: '🗡️',
                type: 'weapon',
                maxLevel: 8,
                description: 'Blades orbit around you',
                stats: { damage: 8, count: 2, radius: 60, speed: 0.08 },
                onUpgrade: (stats, level) => {
                    stats.damage += 3;
                    if (level % 2 === 0) stats.count++;
                    if (level === 4) stats.radius += 20;
                },
                evolutionRequires: 'speedBoost',
                evolvedForm: 'bladeMaster'
            },
            
            fireArea: {
                name: 'Fire Circle',
                icon: '🔥',
                type: 'weapon',
                maxLevel: 8,
                description: 'Creates burning area around you',
                stats: { damage: 3, radius: 80, duration: 120 },
                onUpgrade: (stats, level) => {
                    stats.damage += 1;
                    stats.radius += 10;
                    if (level >= 4) stats.duration += 30;
                },
                evolutionRequires: 'pickupRange',
                evolvedForm: 'inferno'
            },
            
            drone: {
                name: 'Attack Drone',
                icon: '🛸',
                type: 'weapon',
                maxLevel: 8,
                description: 'Drone shoots at enemies',
                stats: { damage: 12, cooldown: 90, count: 1, range: 250 },
                onUpgrade: (stats, level) => {
                    stats.damage += 4;
                    if (level % 3 === 0) stats.count++;
                    stats.cooldown = Math.max(45, stats.cooldown - 8);
                },
                evolutionRequires: 'hpBoost',
                evolvedForm: 'droneSwarm'
            },
            
            // Evolved Weapons
            arcaneBarrage: {
                name: 'Arcane Barrage',
                icon: '✨',
                type: 'weapon',
                maxLevel: 8,
                description: 'Enhanced magic bolts',
                stats: { damage: 35, cooldown: 20, count: 5 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 8;
                    stats.count++;
                }
            },
            
            stormCaller: {
                name: 'Storm Caller',
                icon: '⛈️',
                type: 'weapon',
                maxLevel: 8,
                description: 'Devastating lightning storm',
                stats: { damage: 80, cooldown: 90, count: 4, range: 300 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 15;
                    stats.count++;
                }
            },
            
            bladeMaster: {
                name: 'Blade Master',
                icon: '⚔️',
                type: 'weapon',
                maxLevel: 8,
                description: 'Superior blade control',
                stats: { damage: 20, count: 6, radius: 100, speed: 0.12 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 5;
                    stats.count++;
                }
            },
            
            inferno: {
                name: 'Inferno',
                icon: '🌋',
                type: 'weapon',
                maxLevel: 8,
                description: 'Massive burning field',
                stats: { damage: 8, radius: 180, duration: 200 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 2;
                    stats.radius += 15;
                }
            },
            
            droneSwarm: {
                name: 'Drone Swarm',
                icon: '🚁',
                type: 'weapon',
                maxLevel: 8,
                description: 'Army of attack drones',
                stats: { damage: 25, cooldown: 45, count: 4, range: 350 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 8;
                    stats.count++;
                }
            },
            
            // New Weapons
            laser: {
                name: 'Laser Beam',
                icon: '🔆',
                type: 'weapon',
                maxLevel: 8,
                description: 'Continuous damage beam',
                stats: { damage: 5, cooldown: 5, length: 200, width: 10 },
                onUpgrade: (stats, level) => {
                    stats.damage += 2;
                    if (level % 2 === 0) stats.length += 30;
                    if (level >= 4) stats.width += 2;
                },
                evolutionRequires: 'attackBoost',
                evolvedForm: 'megaLaser'
            },
            
            boomerang: {
                name: 'Boomerang',
                icon: '🪃',
                type: 'weapon',
                maxLevel: 8,
                description: 'Returns to you',
                stats: { damage: 12, cooldown: 120, count: 1, speed: 8 },
                onUpgrade: (stats, level) => {
                    stats.damage += 4;
                    if (level % 3 === 0) stats.count++;
                    stats.cooldown = Math.max(60, stats.cooldown - 10);
                },
                evolutionRequires: 'speedBoost',
                evolvedForm: 'tripleBoomerang'
            },
            
            poison: {
                name: 'Poison Cloud',
                icon: '☠️',
                type: 'weapon',
                maxLevel: 8,
                description: 'Damage over time area',
                stats: { damage: 2, radius: 100, duration: 300, dotDamage: 1 },
                onUpgrade: (stats, level) => {
                    stats.damage += 1;
                    stats.dotDamage += 0.5;
                    stats.radius += 15;
                },
                evolutionRequires: 'pickupRange',
                evolvedForm: 'toxicWave'
            },
            
            // Evolved New Weapons
            megaLaser: {
                name: 'Mega Laser',
                icon: '⚡',
                type: 'weapon',
                maxLevel: 8,
                description: 'Devastating laser beam',
                stats: { damage: 15, cooldown: 5, length: 350, width: 20 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 5;
                    stats.length += 30;
                }
            },
            
            tripleBoomerang: {
                name: 'Triple Boomerang',
                icon: '🎯',
                type: 'weapon',
                maxLevel: 8,
                description: 'Three deadly boomerangs',
                stats: { damage: 30, cooldown: 60, count: 3, speed: 12 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 8;
                    stats.count++;
                }
            },
            
            toxicWave: {
                name: 'Toxic Wave',
                icon: '☢️',
                type: 'weapon',
                maxLevel: 8,
                description: 'Massive poison field',
                stats: { damage: 6, radius: 200, duration: 400, dotDamage: 3 },
                isEvolved: true,
                onUpgrade: (stats, level) => {
                    stats.damage += 2;
                    stats.dotDamage += 1;
                    stats.radius += 20;
                }
            },
            
            // Passive Upgrades
            attackBoost: {
                name: 'Attack Power',
                icon: '💪',
                type: 'passive',
                maxLevel: 5,
                description: 'Increase all damage',
                stats: { multiplier: 1.15 },
                onUpgrade: (stats) => {
                    stats.multiplier += 0.15;
                }
            },
            
            cooldownBoost: {
                name: 'Cool Head',
                icon: '⏱️',
                type: 'passive',
                maxLevel: 5,
                description: 'Reduce weapon cooldowns',
                stats: { reduction: 0.1 },
                onUpgrade: (stats) => {
                    stats.reduction += 0.08;
                }
            },
            
            speedBoost: {
                name: 'Swift Steps',
                icon: '👟',
                type: 'passive',
                maxLevel: 5,
                description: 'Increase movement speed',
                stats: { multiplier: 1.15 },
                onUpgrade: (stats) => {
                    stats.multiplier += 0.15;
                }
            },
            
            hpBoost: {
                name: 'Vitality',
                icon: '❤️',
                type: 'passive',
                maxLevel: 5,
                description: 'Increase max HP',
                stats: { bonus: 25 },
                onUpgrade: (stats) => {
                    stats.bonus += 20;
                }
            },
            
            pickupRange: {
                name: 'Magnetism',
                icon: '🧲',
                type: 'passive',
                maxLevel: 5,
                description: 'Increase XP pickup range',
                stats: { range: 50 },
                onUpgrade: (stats) => {
                    stats.range += 30;
                }
            }
        };

        // ============================================
        // PLAYER CLASS
        // ============================================
        class Player {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                
                // Apply permanent upgrades
                const hpBonus = game.permanentUpgrades.maxHp * 25;
                this.maxHp = CONFIG.PLAYER_HP + hpBonus;
                this.hp = this.maxHp;
                
                this.level = 1;
                this.xp = 0;
                this.xpToLevel = CONFIG.BASE_XP_TO_LEVEL;
                this.radius = CONFIG.PLAYER_RADIUS;
                this.baseSpeed = CONFIG.PLAYER_BASE_SPEED; // Now limited to 1.5 (vs enemy 1.2)
                
                // Permanent damage and defense multipliers
                this.permanentDamageBonus = 1 + (game.permanentUpgrades.damage * 0.15);
                this.defenseReduction = game.permanentUpgrades.defense * 0.05;
                
                // Power-ups owned by player
                this.powerups = new Map();
                
                // Weapon states
                this.weapons = new Map();
                
                // Passive bonuses
                this.damageMultiplier = 1;
                this.cooldownReduction = 0;
                this.speedMultiplier = 1;
                this.pickupRange = CONFIG.XP_MAGNET_RADIUS;
            }

            addPowerup(powerupId) {
                if (this.powerups.has(powerupId)) {
                    // Upgrade existing
                    const powerup = this.powerups.get(powerupId);
                    powerup.level++;
                    
                    const definition = POWERUP_TYPES[powerupId];
                    definition.onUpgrade(powerup.stats, powerup.level);
                    
                    // Check for evolution (Level 6 = Level 5 + 1 more upgrade)
                    if (definition.evolutionRequires && 
                        powerup.level >= 6 && 
                        this.powerups.has(definition.evolutionRequires)) {
                        
                        // Evolve weapon
                        this.powerups.delete(powerupId);
                        this.addPowerup(definition.evolvedForm);
                        
                        // Visual feedback
                        this.createEvolutionEffect();
                        return;
                    }
                } else {
                    // New powerup
                    const definition = POWERUP_TYPES[powerupId];
                    this.powerups.set(powerupId, {
                        id: powerupId,
                        level: 1,
                        stats: JSON.parse(JSON.stringify(definition.stats)) // Deep copy
                    });
                }
                
                // Apply passive bonuses
                this.updatePassiveBonuses();
                
                // Initialize weapon state if needed
                const definition = POWERUP_TYPES[powerupId];
                if (definition.type === 'weapon' && !this.weapons.has(powerupId)) {
                    this.weapons.set(powerupId, { cooldown: 0, angle: 0 });
                }
            }

            updatePassiveBonuses() {
                // Reset to base
                this.damageMultiplier = 1;
                this.cooldownReduction = 0;
                this.speedMultiplier = 1;
                this.pickupRange = CONFIG.XP_MAGNET_RADIUS;
                let hpBonus = 0;
                
                // Apply all passive bonuses
                this.powerups.forEach((powerup, id) => {
                    const definition = POWERUP_TYPES[id];
                    if (definition.type === 'passive') {
                        switch(id) {
                            case 'attackBoost':
                                this.damageMultiplier *= powerup.stats.multiplier;
                                break;
                            case 'cooldownBoost':
                                this.cooldownReduction += powerup.stats.reduction;
                                break;
                            case 'speedBoost':
                                this.speedMultiplier *= powerup.stats.multiplier;
                                break;
                            case 'hpBoost':
                                hpBonus += powerup.stats.bonus;
                                break;
                            case 'pickupRange':
                                this.pickupRange += powerup.stats.range;
                                break;
                        }
                    }
                });
                
                // Apply HP bonus
                const hpPercent = this.hp / this.maxHp;
                this.maxHp = CONFIG.PLAYER_HP + hpBonus;
                this.hp = Math.min(this.maxHp, this.hp + hpBonus);
            }

            createEvolutionEffect() {
                // Create spectacular particle effect
                for (let i = 0; i < 50; i++) {
                    const angle = (Math.PI * 2 * i) / 50;
                    const speed = 2 + Math.random() * 3;
                    game.particles.push(new Particle(
                        this.x,
                        this.y,
                        angle,
                        speed,
                        '#a855f7',
                        60
                    ));
                }
            }

            update(movementInput) {
                // Apply movement from scroll/touch
                const speed = this.baseSpeed * this.speedMultiplier;
                this.x += movementInput.dx;
                this.y += movementInput.dy;

                // Keep in bounds
                this.x = Math.max(this.radius, Math.min(game.canvas.width - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(game.canvas.height - this.radius, this.y));

                // Update all weapons
                this.updateWeapons();
            }

            updateWeapons() {
                this.powerups.forEach((powerup, id) => {
                    const definition = POWERUP_TYPES[id];
                    if (definition.type === 'weapon') {
                        const weaponState = this.weapons.get(id);
                        
                        // Handle each weapon type
                        switch(id) {
                            case 'projectile':
                            case 'arcaneBarrage':
                                this.updateProjectileWeapon(powerup, weaponState);
                                break;
                            case 'lightning':
                            case 'stormCaller':
                                this.updateLightningWeapon(powerup, weaponState);
                                break;
                            case 'blade':
                            case 'bladeMaster':
                                this.updateBladeWeapon(powerup, weaponState);
                                break;
                            case 'fireArea':
                            case 'inferno':
                                this.updateFireWeapon(powerup, weaponState);
                                break;
                            case 'drone':
                            case 'droneSwarm':
                                this.updateDroneWeapon(powerup, weaponState);
                                break;
                            case 'laser':
                            case 'megaLaser':
                                this.updateLaserWeapon(powerup, weaponState);
                                break;
                            case 'boomerang':
                            case 'tripleBoomerang':
                                this.updateBoomerangWeapon(powerup, weaponState);
                                break;
                            case 'poison':
                            case 'toxicWave':
                                this.updatePoisonWeapon(powerup, weaponState);
                                break;
                        }
                    }
                });
            }

            updateProjectileWeapon(powerup, state) {
                const cooldown = powerup.stats.cooldown * (1 - this.cooldownReduction);
                state.cooldown--;
                
                if (state.cooldown <= 0) {
                    const nearest = this.findNearestEnemies(powerup.stats.count);
                    if (nearest.length > 0) {
                        playSound('shoot');
                        nearest.forEach(enemy => {
                            const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                            const damage = powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus;
                            game.projectiles.push(new Projectile(this.x, this.y, angle, damage, '#3b82f6'));
                        });
                    }
                    state.cooldown = cooldown;
                }
            }

            updateLightningWeapon(powerup, state) {
                const cooldown = powerup.stats.cooldown * (1 - this.cooldownReduction);
                state.cooldown--;
                
                if (state.cooldown <= 0) {
                    const targets = this.findNearestEnemies(powerup.stats.count);
                    targets.forEach(enemy => {
                        const damage = powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus;
                        new Lightning(enemy.x, enemy.y, damage);
                    });
                    state.cooldown = cooldown;
                }
            }

            updateBladeWeapon(powerup, state) {
                // Blades orbit continuously
                state.angle += powerup.stats.speed;
                
                for (let i = 0; i < powerup.stats.count; i++) {
                    const angle = state.angle + (Math.PI * 2 * i / powerup.stats.count);
                    const bladeX = this.x + Math.cos(angle) * powerup.stats.radius;
                    const bladeY = this.y + Math.sin(angle) * powerup.stats.radius;
                    
                    // Check collision with enemies
                    game.enemies.forEach(enemy => {
                        const dist = Math.sqrt((bladeX - enemy.x) ** 2 + (bladeY - enemy.y) ** 2);
                        if (dist < 15 + enemy.radius) {
                            const damage = powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus;
                            enemy.takeDamage(damage);
                        }
                    });
                }
            }

            updateFireWeapon(powerup, state) {
                // Continuous fire damage in area
                game.enemies.forEach(enemy => {
                    const dist = Math.sqrt((this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2);
                    if (dist < powerup.stats.radius) {
                        const damage = (powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus) / 60; // Per frame
                        enemy.takeDamage(damage);
                    }
                });
            }

            updateDroneWeapon(powerup, state) {
                const cooldown = powerup.stats.cooldown * (1 - this.cooldownReduction);
                state.cooldown--;
                
                if (state.cooldown <= 0) {
                    const targets = this.findNearestEnemies(powerup.stats.count);
                    targets.forEach((enemy, i) => {
                        const droneAngle = (Math.PI * 2 * i / powerup.stats.count);
                        const droneX = this.x + Math.cos(droneAngle) * 50;
                        const droneY = this.y + Math.sin(droneAngle) * 50;
                        
                        const angle = Math.atan2(enemy.y - droneY, enemy.x - droneX);
                        const damage = powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus;
                        game.projectiles.push(new Projectile(droneX, droneY, angle, damage, '#10b981'));
                    });
                    state.cooldown = cooldown;
                }
            }

            updateLaserWeapon(powerup, state) {
                const cooldown = powerup.stats.cooldown * (1 - this.cooldownReduction);
                state.cooldown--;
                
                if (state.cooldown <= 0) {
                    const nearest = this.findNearestEnemies(1);
                    if (nearest.length > 0) {
                        const enemy = nearest[0];
                        const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                        
                        // Create laser beam
                        game.projectiles.push(new Laser(
                            this.x, this.y, angle,
                            powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus,
                            powerup.stats.length,
                            powerup.stats.width
                        ));
                    }
                    state.cooldown = cooldown;
                }
            }

            updateBoomerangWeapon(powerup, state) {
                const cooldown = powerup.stats.cooldown * (1 - this.cooldownReduction);
                state.cooldown--;
                
                if (state.cooldown <= 0) {
                    for (let i = 0; i < powerup.stats.count; i++) {
                        const angle = (Math.PI * 2 * i / powerup.stats.count) + game.gameTime * 0.01;
                        const damage = powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus;
                        game.projectiles.push(new Boomerang(
                            this.x, this.y, angle, damage, powerup.stats.speed
                        ));
                    }
                    state.cooldown = cooldown;
                }
            }

            updatePoisonWeapon(powerup, state) {
                // Continuous poison damage
                if (!state.poisonedEnemies) state.poisonedEnemies = new Set();
                
                game.enemies.forEach(enemy => {
                    const dist = Math.sqrt((this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2);
                    if (dist < powerup.stats.radius) {
                        const damage = (powerup.stats.damage * this.damageMultiplier * this.permanentDamageBonus) / 60;
                        enemy.takeDamage(damage);
                        
                        // Apply DOT effect
                        if (!state.poisonedEnemies.has(enemy)) {
                            state.poisonedEnemies.add(enemy);
                            applyPoisonDOT(enemy, powerup.stats.dotDamage * this.damageMultiplier);
                        }
                    }
                });
            }

            findNearestEnemies(count) {
                const sorted = [...game.enemies].sort((a, b) => {
                    const distA = Math.sqrt((this.x - a.x) ** 2 + (this.y - a.y) ** 2);
                    const distB = Math.sqrt((this.x - b.x) ** 2 + (this.y - b.y) ** 2);
                    return distA - distB;
                });
                return sorted.slice(0, count);
            }

            gainXp(amount) {
                this.xp += amount;
                
                if (this.xp >= this.xpToLevel) {
                    this.xp -= this.xpToLevel;
                    this.levelUp();
                }
                
                this.updateUI();
            }

            levelUp() {
                this.level++;
                this.xpToLevel = Math.floor(this.xpToLevel * CONFIG.XP_SCALE);
                
                // Play levelup sound
                playSound('levelup');
                
                // Show power-up selection
                showPowerupSelection();
                
                // Heal on level up
                this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.2);
                
                this.updateUI();
            }

            takeDamage(amount) {
                // Apply defense reduction
                const actualDamage = amount * (1 - this.defenseReduction);
                this.hp -= actualDamage;
                
                // Create floating damage text
                game.damageTexts.push(new DamageText(this.x, this.y - this.radius, actualDamage, false));
                
                // Play hit sound
                playSound('hit');
                
                if (this.hp < 0) this.hp = 0;
                
                this.updateUI();
                
                if (this.hp <= 0) {
                    endGame();
                }
            }

            updateUI() {
                const hpPercent = (this.hp / this.maxHp) * 100;
                document.getElementById('hpBar').style.width = hpPercent + '%';
                document.getElementById('hpText').textContent = 
                    `${Math.floor(this.hp)} / ${this.maxHp}`;
                
                const xpPercent = (this.xp / this.xpToLevel) * 100;
                document.getElementById('xpBar').style.width = xpPercent + '%';
                document.getElementById('xpText').textContent = 
                    `${Math.floor(this.xp)} / ${this.xpToLevel}`;
                
                document.getElementById('level').textContent = this.level;
            }

            draw() {
                const ctx = game.ctx;
                
                // Draw fire area if active
                this.powerups.forEach((powerup, id) => {
                    if (id === 'fireArea' || id === 'inferno') {
                        const gradient = ctx.createRadialGradient(
                            this.x, this.y, 0,
                            this.x, this.y, powerup.stats.radius
                        );
                        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
                        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, powerup.stats.radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Draw poison area if active
                    if (id === 'poison' || id === 'toxicWave') {
                        const gradient = ctx.createRadialGradient(
                            this.x, this.y, 0,
                            this.x, this.y, powerup.stats.radius
                        );
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
                        gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, powerup.stats.radius, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Poison bubbles animation
                        for (let i = 0; i < 3; i++) {
                            const angle = (game.gameTime / 30 + i * Math.PI * 2 / 3);
                            const bubbleX = this.x + Math.cos(angle) * (powerup.stats.radius * 0.7);
                            const bubbleY = this.y + Math.sin(angle) * (powerup.stats.radius * 0.7);
                            ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
                            ctx.beginPath();
                            ctx.arc(bubbleX, bubbleY, 8, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                });
                
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                ctx.arc(this.x + 3, this.y + 3, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // CUSTOM PLAYER SPRITE - Knight/Hero
                // Body (armor)
                const bodyGradient = ctx.createRadialGradient(
                    this.x - 3, this.y - 3, 0,
                    this.x, this.y, this.radius
                );
                bodyGradient.addColorStop(0, '#60a5fa');
                bodyGradient.addColorStop(1, '#2563eb');
                ctx.fillStyle = bodyGradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // Armor plates
                ctx.strokeStyle = '#1e40af';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();

                // Helmet visor
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(this.x - 8, this.y - 4, 16, 6);
                
                // Eye glow (cyan)
                ctx.fillStyle = '#22d3ee';
                ctx.fillRect(this.x - 6, this.y - 2, 4, 2);
                ctx.fillRect(this.x + 2, this.y - 2, 4, 2);
                
                // Shoulder pads
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.arc(this.x - this.radius * 0.8, this.y - this.radius * 0.3, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(this.x + this.radius * 0.8, this.y - this.radius * 0.3, 5, 0, Math.PI * 2);
                ctx.fill();

                // Chest emblem (star)
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const x = this.x + Math.cos(angle) * 4;
                    const y = this.y + 2 + Math.sin(angle) * 4;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();

                // Outline glow
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#3b82f6';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                
                // Level indicator (small badge)
                if (this.level > 1) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(this.x + this.radius * 0.7, this.y - this.radius * 0.7, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    
                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 8px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.level, this.x + this.radius * 0.7, this.y - this.radius * 0.7);
                }
                
                // Draw blades if active
                this.powerups.forEach((powerup, id) => {
                    if (id === 'blade' || id === 'bladeMaster') {
                        const weaponState = this.weapons.get(id);
                        for (let i = 0; i < powerup.stats.count; i++) {
                            const angle = weaponState.angle + (Math.PI * 2 * i / powerup.stats.count);
                            const bladeX = this.x + Math.cos(angle) * powerup.stats.radius;
                            const bladeY = this.y + Math.sin(angle) * powerup.stats.radius;
                            
                            ctx.save();
                            ctx.translate(bladeX, bladeY);
                            ctx.rotate(angle);
                            
                            ctx.fillStyle = '#64748b';
                            ctx.fillRect(-15, -3, 30, 6);
                            
                            ctx.fillStyle = '#cbd5e1';
                            ctx.beginPath();
                            ctx.moveTo(15, 0);
                            ctx.lineTo(8, -5);
                            ctx.lineTo(8, 5);
                            ctx.fill();
                            
                            ctx.restore();
                        }
                    }
                });
                
                // Draw drones if active
                this.powerups.forEach((powerup, id) => {
                    if (id === 'drone' || id === 'droneSwarm') {
                        for (let i = 0; i < powerup.stats.count; i++) {
                            const angle = (game.gameTime / 60) + (Math.PI * 2 * i / powerup.stats.count);
                            const droneX = this.x + Math.cos(angle) * 50;
                            const droneY = this.y + Math.sin(angle) * 50;
                            
                            ctx.fillStyle = '#10b981';
                            ctx.beginPath();
                            ctx.arc(droneX, droneY, 6, 0, Math.PI * 2);
                            ctx.fill();
                            
                            ctx.strokeStyle = '#34d399';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    }
                });
            }
        }

        // ============================================
        // ENEMY CLASSES
        // ============================================
        class Enemy {
            constructor(x, y, type = 'basic') {
                this.x = x;
                this.y = y;
                this.type = type;
                
                // Scale stats based on wave number
                const waveMult = Math.pow(CONFIG.ENEMY_HP_SCALE, game.currentWave - 1);
                const speedMult = Math.pow(CONFIG.ENEMY_SPEED_SCALE, game.currentWave - 1);
                const damageMult = Math.pow(CONFIG.ENEMY_DAMAGE_SCALE, game.currentWave - 1);
                
                // Set base stats by type
                this.setTypeStats(waveMult, speedMult, damageMult);
                
                this.maxHp = this.hp;
                this.attackCooldown = 0;
            }

            setTypeStats(waveMult, speedMult, damageMult) {
                // Calculate wave-based HP scaling (20% more HP per wave)
                const waveHPMult = Math.pow(CONFIG.ENEMY_HP_PER_WAVE, game.currentWave - 1);
                
                switch(this.type) {
                    case 'basic':
                        this.hp = CONFIG.ENEMY_BASE_HP * waveHPMult;
                        this.speed = CONFIG.ENEMY_BASE_SPEED * speedMult;
                        this.damage = CONFIG.ENEMY_BASE_DAMAGE * damageMult;
                        this.radius = 12;
                        this.xpValue = 15 + (game.currentWave * 2);
                        this.color = '#ef4444';
                        this.eyeColor = '#fff';
                        break;
                        
                    case 'fast':
                        this.hp = (CONFIG.ENEMY_BASE_HP * 0.6) * waveHPMult;
                        this.speed = (CONFIG.ENEMY_BASE_SPEED * 1.8) * speedMult;
                        this.damage = (CONFIG.ENEMY_BASE_DAMAGE * 0.7) * damageMult;
                        this.radius = 10;
                        this.xpValue = 12 + (game.currentWave * 2);
                        this.color = '#f59e0b';
                        this.eyeColor = '#fff';
                        break;
                        
                    case 'tank':
                        this.hp = (CONFIG.ENEMY_BASE_HP * 3) * waveHPMult;
                        this.speed = (CONFIG.ENEMY_BASE_SPEED * 0.6) * speedMult;
                        this.damage = (CONFIG.ENEMY_BASE_DAMAGE * 1.5) * damageMult;
                        this.radius = 18;
                        this.xpValue = 40 + (game.currentWave * 5);
                        this.color = '#8b5cf6';
                        this.eyeColor = '#fff';
                        break;
                        
                    case 'boss':
                        this.hp = (CONFIG.ENEMY_BASE_HP * 20) * waveHPMult;
                        this.speed = (CONFIG.ENEMY_BASE_SPEED * 0.8) * speedMult;
                        this.damage = (CONFIG.ENEMY_BASE_DAMAGE * 2) * damageMult;
                        this.radius = 35;
                        this.xpValue = 200 + (game.currentWave * 20);
                        this.color = '#dc2626';
                        this.eyeColor = '#fbbf24';
                        this.isBoss = true;
                        break;
                }
            }

            update() {
                if (!game.player) return;

                // Move toward player
                const dx = game.player.x - this.x;
                const dy = game.player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }

                // Attack player if touching
                this.attackCooldown--;
                if (dist < this.radius + game.player.radius) {
                    if (this.attackCooldown <= 0) {
                        game.player.takeDamage(this.damage);
                        this.attackCooldown = 60;
                    }
                }
            }

            takeDamage(amount) {
                // Check for critical hit
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                const finalDamage = isCrit ? amount * CONFIG.CRIT_MULTIPLIER : amount;
                
                this.hp -= finalDamage;
                
                // Create floating damage text
                game.damageTexts.push(new DamageText(this.x, this.y - this.radius, finalDamage, isCrit));
                
                // Screen shake on critical or boss hit
                if (isCrit) {
                    addScreenShake(isCrit ? 8 : 4);
                }
                
                if (this.isBoss && isCrit) {
                    addScreenShake(15);
                }
                
                // Flash effect
                const originalColor = this.color;
                this.color = isCrit ? '#fbbf24' : '#fff';
                setTimeout(() => { this.color = originalColor; }, isCrit ? 100 : 50);
                
                if (this.hp <= 0) {
                    this.die();
                }
            }

            die() {
                game.enemiesKilled++;
                
                // Update combo
                updateCombo();
                
                // Calculate coin drops (more coins in higher waves + combo bonus)
                const baseCoinDrop = CONFIG.BASE_COIN_DROP + 
                    Math.floor(game.currentWave * CONFIG.WAVE_COIN_MULTIPLIER);
                
                let coinCount = baseCoinDrop;
                let coinValue = 1;
                
                // Apply combo bonus
                const comboBonus = 1 + (game.comboTier * CONFIG.COMBO_COIN_BONUS);
                coinCount = Math.floor(coinCount * comboBonus);
                
                // Boss drops way more coins
                if (this.isBoss) {
                    coinCount = baseCoinDrop * CONFIG.BOSS_COIN_MULTIPLIER;
                    coinValue = 5;
                    addScreenShake(25); // Big shake on boss death
                } else if (this.type === 'tank') {
                    coinCount = Math.floor(baseCoinDrop * 2 * comboBonus);
                } else if (this.type === 'fast') {
                    coinCount = Math.floor(baseCoinDrop * 0.7 * comboBonus);
                }
                
                // Drop coins
                for (let i = 0; i < coinCount; i++) {
                    const angle = (Math.PI * 2 * i) / coinCount;
                    const distance = this.radius + Math.random() * 20;
                    const coinX = this.x + Math.cos(angle) * distance;
                    const coinY = this.y + Math.sin(angle) * distance;
                    game.coins.push(new Coin(coinX, coinY, coinValue));
                }
                
                // Drop XP
                const orbCount = this.isBoss ? 5 : 1;
                for (let i = 0; i < orbCount; i++) {
                    const offsetX = (Math.random() - 0.5) * this.radius * 2;
                    const offsetY = (Math.random() - 0.5) * this.radius * 2;
                    game.xpOrbs.push(new XPOrb(
                        this.x + offsetX, 
                        this.y + offsetY, 
                        this.xpValue / orbCount
                    ));
                }
                
                // Particles
                const particleCount = this.isBoss ? 30 : 8;
                for (let i = 0; i < particleCount; i++) {
                    const angle = (Math.PI * 2 * i) / particleCount;
                    const speed = this.isBoss ? 4 : 2;
                    game.particles.push(new Particle(
                        this.x, this.y, angle, speed, this.color, 30
                    ));
                }
                
                // Remove from array
                const index = game.enemies.indexOf(this);
                if (index > -1) {
                    game.enemies.splice(index, 1);
                }
            }

            draw() {
                const ctx = game.ctx;
                
                // Boss glow effect
                if (this.isBoss) {
                    const gradient = ctx.createRadialGradient(
                        this.x, this.y, 0,
                        this.x, this.y, this.radius * 1.5
                    );
                    gradient.addColorStop(0, 'rgba(220, 38, 38, 0.3)');
                    gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(this.x + 2, this.y + 2, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // CUSTOM ENEMY SPRITES based on type
                if (this.type === 'basic') {
                    // Basic Slime - Red blob
                    const bodyGradient = ctx.createRadialGradient(
                        this.x, this.y - this.radius * 0.3, 0,
                        this.x, this.y, this.radius
                    );
                    bodyGradient.addColorStop(0, '#f87171');
                    bodyGradient.addColorStop(1, '#dc2626');
                    ctx.fillStyle = bodyGradient;
                    
                    // Squash effect (animated)
                    const squash = 1 + Math.sin(game.gameTime * 0.1) * 0.1;
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.scale(1 / squash, squash);
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    
                    // Eyes
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(this.x - 4, this.y - 3, 3, 0, Math.PI * 2);
                    ctx.arc(this.x + 4, this.y - 3, 3, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.arc(this.x - 4, this.y - 3, 1.5, 0, Math.PI * 2);
                    ctx.arc(this.x + 4, this.y - 3, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                } else if (this.type === 'fast') {
                    // Fast Bat - Orange flying creature
                    const wingFlap = Math.sin(game.gameTime * 0.3) * 5;
                    
                    // Body
                    ctx.fillStyle = '#fb923c';
                    ctx.beginPath();
                    ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Wings
                    ctx.fillStyle = '#f97316';
                    ctx.beginPath();
                    // Left wing
                    ctx.moveTo(this.x - this.radius * 0.5, this.y);
                    ctx.quadraticCurveTo(
                        this.x - this.radius * 1.5, 
                        this.y - wingFlap,
                        this.x - this.radius, 
                        this.y + 5
                    );
                    ctx.lineTo(this.x - this.radius * 0.5, this.y + 3);
                    ctx.fill();
                    
                    // Right wing
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.radius * 0.5, this.y);
                    ctx.quadraticCurveTo(
                        this.x + this.radius * 1.5, 
                        this.y - wingFlap,
                        this.x + this.radius, 
                        this.y + 5
                    );
                    ctx.lineTo(this.x + this.radius * 0.5, this.y + 3);
                    ctx.fill();
                    
                    // Eyes (red glowing)
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(this.x - 3, this.y - 2, 2, 0, Math.PI * 2);
                    ctx.arc(this.x + 3, this.y - 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                } else if (this.type === 'tank') {
                    // Tank Golem - Purple armored
                    // Body
                    const bodyGradient = ctx.createRadialGradient(
                        this.x, this.y - this.radius * 0.3, 0,
                        this.x, this.y, this.radius
                    );
                    bodyGradient.addColorStop(0, '#a78bfa');
                    bodyGradient.addColorStop(1, '#7c3aed');
                    ctx.fillStyle = bodyGradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Armor pieces
                    ctx.fillStyle = '#6d28d9';
                    ctx.fillRect(this.x - this.radius * 0.7, this.y - this.radius * 0.5, this.radius * 1.4, 5);
                    ctx.fillRect(this.x - this.radius * 0.7, this.y + this.radius * 0.2, this.radius * 1.4, 5);
                    
                    // Spikes
                    ctx.fillStyle = '#581c87';
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 * i) / 6;
                        const spikeX = this.x + Math.cos(angle) * this.radius;
                        const spikeY = this.y + Math.sin(angle) * this.radius;
                        ctx.beginPath();
                        ctx.moveTo(spikeX, spikeY);
                        ctx.lineTo(
                            spikeX + Math.cos(angle) * 6,
                            spikeY + Math.sin(angle) * 6
                        );
                        ctx.lineTo(
                            spikeX + Math.cos(angle + 0.3) * 4,
                            spikeY + Math.sin(angle + 0.3) * 4
                        );
                        ctx.fill();
                    }
                    
                    // Eyes (glowing)
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(this.x - 6, this.y - 4, 3, 0, Math.PI * 2);
                    ctx.arc(this.x + 6, this.y - 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    
                } else if (this.type === 'boss') {
                    // BOSS - Demon Lord
                    // Main body with gradient
                    const bodyGradient = ctx.createRadialGradient(
                        this.x, this.y - this.radius * 0.3, 0,
                        this.x, this.y, this.radius
                    );
                    bodyGradient.addColorStop(0, '#ef4444');
                    bodyGradient.addColorStop(0.5, '#dc2626');
                    bodyGradient.addColorStop(1, '#991b1b');
                    ctx.fillStyle = bodyGradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Demon horns (animated)
                    const hornGlow = Math.sin(game.gameTime * 0.1) * 0.3 + 0.7;
                    ctx.fillStyle = `rgba(251, 191, 36, ${hornGlow})`;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#fbbf24';
                    
                    // Left horn
                    ctx.beginPath();
                    ctx.moveTo(this.x - this.radius * 0.5, this.y - this.radius * 0.8);
                    ctx.quadraticCurveTo(
                        this.x - this.radius * 1.2,
                        this.y - this.radius * 1.5,
                        this.x - this.radius * 0.8,
                        this.y - this.radius * 1.8
                    );
                    ctx.lineTo(this.x - this.radius * 0.6, this.y - this.radius * 1.5);
                    ctx.quadraticCurveTo(
                        this.x - this.radius * 0.9,
                        this.y - this.radius * 1.2,
                        this.x - this.radius * 0.5, 
                        this.y - this.radius * 0.9
                    );
                    ctx.fill();
                    
                    // Right horn (mirror)
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.radius * 0.5, this.y - this.radius * 0.8);
                    ctx.quadraticCurveTo(
                        this.x + this.radius * 1.2,
                        this.y - this.radius * 1.5,
                        this.x + this.radius * 0.8,
                        this.y - this.radius * 1.8
                    );
                    ctx.lineTo(this.x + this.radius * 0.6, this.y - this.radius * 1.5);
                    ctx.quadraticCurveTo(
                        this.x + this.radius * 0.9,
                        this.y - this.radius * 1.2,
                        this.x + this.radius * 0.5, 
                        this.y - this.radius * 0.9
                    );
                    ctx.fill();
                    
                    ctx.shadowBlur = 0;
                    
                    // Angry eyes (glowing)
                    const eyeGlow = Math.sin(game.gameTime * 0.2) * 5;
                    ctx.shadowBlur = 10 + eyeGlow;
                    ctx.shadowColor = '#fbbf24';
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(this.x - 10, this.y - 5, 6, 0, Math.PI * 2);
                    ctx.arc(this.x + 10, this.y - 5, 6, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#dc2626';
                    ctx.beginPath();
                    ctx.arc(this.x - 10, this.y - 5, 3, 0, Math.PI * 2);
                    ctx.arc(this.x + 10, this.y - 5, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    
                    // Demon mouth/teeth
                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y + 8, 8, 0, Math.PI);
                    ctx.fill();
                    
                    ctx.fillStyle = '#fff';
                    for (let i = -2; i <= 2; i++) {
                        ctx.fillRect(this.x + i * 5 - 1, this.y + 8, 2, 4);
                    }
                    
                    // Crown/Boss indicator
                    ctx.fillStyle = '#fbbf24';
                    for (let i = 0; i < 5; i++) {
                        const angle = (Math.PI / 4) + (Math.PI / 8 * i);
                        const crownX = this.x + Math.cos(angle - Math.PI / 2) * this.radius;
                        const crownY = this.y + Math.sin(angle - Math.PI / 2) * this.radius;
                        ctx.beginPath();
                        ctx.arc(crownX, crownY, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // HP bar
                if (this.hp < this.maxHp) {
                    const barWidth = this.radius * 2.2;
                    const barHeight = this.isBoss ? 8 : 5;
                    const barX = this.x - barWidth / 2;
                    const barY = this.y - this.radius - 12;
                    
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(barX, barY, barWidth, barHeight);
                    
                    ctx.fillStyle = this.isBoss ? '#fbbf24' : '#ef4444';
                    ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
                    
                    // HP bar border
                    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(barX, barY, barWidth, barHeight);
                    
                    // Boss name
                    if (this.isBoss) {
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = 'bold 12px Arial';
                        ctx.textAlign = 'center';
                        ctx.shadowBlur = 5;
                        ctx.shadowColor = '#000';
                        ctx.fillText('👑 BOSS 👑', this.x, this.y - this.radius - 22);
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }

        // ============================================
        // PROJECTILE CLASS
        // ============================================
        class Projectile {
            constructor(x, y, angle, damage, color) {
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.speed = 10;
                this.damage = damage;
                this.radius = 6;
                this.color = color;
                this.life = 100;
            }

            update() {
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.life--;

                // Check collision with enemies
                for (const enemy of game.enemies) {
                    const dist = Math.sqrt((this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2);
                    if (dist < this.radius + enemy.radius) {
                        enemy.takeDamage(this.damage);
                        this.life = 0;
                        
                        // Impact particles
                        for (let i = 0; i < 4; i++) {
                            const angle = (Math.PI * 2 * i) / 4;
                            game.particles.push(new Particle(
                                this.x, this.y, angle, 1.5, this.color, 15
                            ));
                        }
                        break;
                    }
                }

                // Remove if expired or off screen
                if (this.life <= 0 || 
                    this.x < 0 || this.x > game.canvas.width || 
                    this.y < 0 || this.y > game.canvas.height) {
                    const index = game.projectiles.indexOf(this);
                    if (index > -1) {
                        game.projectiles.splice(index, 1);
                    }
                }
            }

            draw() {
                const ctx = game.ctx;
                
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Trail
                ctx.fillStyle = this.color + '40';
                ctx.beginPath();
                ctx.arc(
                    this.x - Math.cos(this.angle) * 10,
                    this.y - Math.sin(this.angle) * 10,
                    this.radius * 0.7,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }

        // ============================================
        // LASER CLASS
        // ============================================
        class Laser {
            constructor(x, y, angle, damage, length, width) {
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.damage = damage;
                this.length = length;
                this.width = width;
                this.life = 10; // Short duration
                this.endX = x + Math.cos(angle) * length;
                this.endY = y + Math.sin(angle) * length;
                
                // Deal damage immediately
                this.dealDamage();
            }

            dealDamage() {
                game.enemies.forEach(enemy => {
                    // Check if enemy intersects with laser line
                    const dist = this.pointToLineDistance(enemy.x, enemy.y);
                    if (dist < this.width + enemy.radius) {
                        // Check if enemy is within laser length
                        const dx = enemy.x - this.x;
                        const dy = enemy.y - this.y;
                        const projection = dx * Math.cos(this.angle) + dy * Math.sin(this.angle);
                        
                        if (projection >= 0 && projection <= this.length) {
                            enemy.takeDamage(this.damage);
                        }
                    }
                });
            }

            pointToLineDistance(px, py) {
                const dx = this.endX - this.x;
                const dy = this.endY - this.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                
                if (len === 0) return Math.sqrt((px - this.x) ** 2 + (py - this.y) ** 2);
                
                const t = Math.max(0, Math.min(1, ((px - this.x) * dx + (py - this.y) * dy) / (len * len)));
                const projX = this.x + t * dx;
                const projY = this.y + t * dy;
                
                return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
            }

            update() {
                this.life--;
                if (this.life <= 0) {
                    const index = game.projectiles.indexOf(this);
                    if (index > -1) {
                        game.projectiles.splice(index, 1);
                    }
                }
            }

            draw() {
                const ctx = game.ctx;
                const alpha = this.life / 10;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                
                // Outer glow
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = this.width + 4;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.endX, this.endY);
                ctx.stroke();
                
                // Inner beam
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = this.width;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.endX, this.endY);
                ctx.stroke();
                
                ctx.restore();
            }
        }

        // ============================================
        // BOOMERANG CLASS
        // ============================================
        class Boomerang {
            constructor(x, y, angle, damage, speed) {
                this.startX = x;
                this.startY = y;
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.damage = damage;
                this.speed = speed;
                this.radius = 8;
                this.life = 120; // 2 seconds
                this.returning = false;
                this.rotation = 0;
                this.maxDistance = 250;
                this.hitEnemies = new Set();
            }

            update() {
                const distFromStart = Math.sqrt(
                    (this.x - this.startX) ** 2 + (this.y - this.startY) ** 2
                );
                
                // Start returning when max distance reached or half life
                if (!this.returning && (distFromStart > this.maxDistance || this.life < 60)) {
                    this.returning = true;
                }
                
                if (this.returning) {
                    // Return to player
                    if (game.player) {
                        const angleToPlayer = Math.atan2(
                            game.player.y - this.y,
                            game.player.x - this.x
                        );
                        this.x += Math.cos(angleToPlayer) * this.speed;
                        this.y += Math.sin(angleToPlayer) * this.speed;
                        
                        // Check if returned
                        const distToPlayer = Math.sqrt(
                            (this.x - game.player.x) ** 2 + (this.y - game.player.y) ** 2
                        );
                        if (distToPlayer < 20) {
                            this.life = 0;
                        }
                    }
                } else {
                    // Move outward
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                }
                
                this.rotation += 0.3;
                this.life--;

                // Check collision with enemies
                game.enemies.forEach(enemy => {
                    if (!this.hitEnemies.has(enemy)) {
                        const dist = Math.sqrt((this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2);
                        if (dist < this.radius + enemy.radius) {
                            enemy.takeDamage(this.damage);
                            this.hitEnemies.add(enemy);
                            
                            // Particles
                            for (let i = 0; i < 4; i++) {
                                const angle = (Math.PI * 2 * i) / 4;
                                game.particles.push(new Particle(
                                    this.x, this.y, angle, 2, '#f59e0b', 15
                                ));
                            }
                        }
                    }
                });

                // Remove if expired or off screen
                if (this.life <= 0 || 
                    this.x < -50 || this.x > game.canvas.width + 50 || 
                    this.y < -50 || this.y > game.canvas.height + 50) {
                    const index = game.projectiles.indexOf(this);
                    if (index > -1) {
                        game.projectiles.splice(index, 1);
                    }
                }
            }

            draw() {
                const ctx = game.ctx;
                
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Boomerang shape
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(-6, 0, 6, 0, Math.PI);
                ctx.arc(6, 0, 6, Math.PI, 0);
                ctx.fill();
                
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
                
                // Trail effect
                if (!this.returning) {
                    ctx.fillStyle = '#f59e0b40';
                    ctx.beginPath();
                    ctx.arc(
                        this.x - Math.cos(this.angle) * 15,
                        this.y - Math.sin(this.angle) * 15,
                        this.radius * 0.6,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }

        // Poison DOT function
        function applyPoisonDOT(enemy, dotDamage) {
            if (!enemy.poisonDOT) {
                enemy.poisonDOT = {
                    damage: dotDamage,
                    duration: 180, // 3 seconds
                    tick: 0
                };
                
                // Apply DOT every 30 frames (0.5 seconds)
                const poisonInterval = setInterval(() => {
                    if (enemy.hp > 0 && enemy.poisonDOT) {
                        enemy.poisonDOT.tick++;
                        if (enemy.poisonDOT.tick % 30 === 0) {
                            enemy.takeDamage(dotDamage);
                            
                            // Green poison particle
                            game.particles.push(new Particle(
                                enemy.x, enemy.y - enemy.radius,
                                Math.random() * Math.PI * 2,
                                1, '#10b981', 20
                            ));
                        }
                        
                        if (enemy.poisonDOT.tick >= enemy.poisonDOT.duration) {
                            enemy.poisonDOT = null;
                            clearInterval(poisonInterval);
                        }
                    } else {
                        clearInterval(poisonInterval);
                    }
                }, 16); // ~60fps
            }
        }

        // ============================================
        // LIGHTNING CLASS
        // ============================================
        class Lightning {
            constructor(x, y, damage) {
                this.x = x;
                this.y = y;
                this.damage = damage;
                
                // Apply damage immediately
                game.enemies.forEach(enemy => {
                    const dist = Math.sqrt((this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2);
                    if (dist < 30) {
                        enemy.takeDamage(this.damage);
                    }
                });
                
                // Visual effect
                this.createEffect();
            }

            createEffect() {
                const ctx = game.ctx;
                
                // Warning indicator
                ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 40, 0, Math.PI * 2);
                ctx.fill();
                
                // Lightning bolt particles
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i) / 12;
                    game.particles.push(new Particle(
                        this.x, this.y, angle, 3, '#fbbf24', 20
                    ));
                }
                
                // Draw lightning strike
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#fbbf24';
                
                ctx.beginPath();
                ctx.moveTo(this.x, 0);
                
                let currentX = this.x;
                let currentY = 0;
                
                while (currentY < this.y) {
                    currentY += 20;
                    currentX += (Math.random() - 0.5) * 40;
                    ctx.lineTo(currentX, currentY);
                }
                
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        // ============================================
        // XP ORB CLASS
        // ============================================
        class XPOrb {
            constructor(x, y, value) {
                this.x = x;
                this.y = y;
                this.value = value;
                this.radius = 7;
            }

            update() {
                if (!game.player) return;

                const dist = Math.sqrt(
                    (this.x - game.player.x) ** 2 + 
                    (this.y - game.player.y) ** 2
                );
                
                // Magnet effect
                if (dist < game.player.pickupRange) {
                    const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                    const speed = 4;
                    this.x += Math.cos(angle) * speed;
                    this.y += Math.sin(angle) * speed;
                }

                // Collection
                if (dist < this.radius + game.player.radius) {
                    game.player.gainXp(this.value);
                    
                    // Play XP sound
                    playSound('xp');
                    
                    const index = game.xpOrbs.indexOf(this);
                    if (index > -1) {
                        game.xpOrbs.splice(index, 1);
                    }
                }
            }

            draw() {
                const ctx = game.ctx;
                
                // Outer glow (pulsing)
                const pulse = Math.sin(game.gameTime * 0.1) * 0.3 + 0.7;
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.radius * 3
                );
                gradient.addColorStop(0, `rgba(59, 130, 246, ${0.6 * pulse})`);
                gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Crystal/Gem body
                ctx.save();
                ctx.translate(this.x, this.y);
                
                // Diamond shape (crystal)
                const crystalGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, this.radius);
                crystalGradient.addColorStop(0, '#93c5fd');
                crystalGradient.addColorStop(0.5, '#3b82f6');
                crystalGradient.addColorStop(1, '#1e40af');
                ctx.fillStyle = crystalGradient;
                
                ctx.beginPath();
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(this.radius * 0.7, 0);
                ctx.lineTo(0, this.radius);
                ctx.lineTo(-this.radius * 0.7, 0);
                ctx.closePath();
                ctx.fill();
                
                // Crystal facets (light reflection)
                ctx.fillStyle = 'rgba(147, 197, 253, 0.6)';
                ctx.beginPath();
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(this.radius * 0.3, -this.radius * 0.3);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = 'rgba(147, 197, 253, 0.4)';
                ctx.beginPath();
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(-this.radius * 0.3, -this.radius * 0.3);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
                
                // Bright core/center
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(-this.radius * 0.2, -this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
                ctx.fill();

                // Crystal outline
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(this.radius * 0.7, 0);
                ctx.lineTo(0, this.radius);
                ctx.lineTo(-this.radius * 0.7, 0);
                ctx.closePath();
                ctx.stroke();
                ctx.shadowBlur = 0;
                
                ctx.restore();
                
                // Sparkle particles around orb
                if (game.gameTime % 30 < 15) {
                    for (let i = 0; i < 3; i++) {
                        const angle = (game.gameTime * 0.05) + (Math.PI * 2 * i / 3);
                        const dist = this.radius * 1.5;
                        const sparkleX = this.x + Math.cos(angle) * dist;
                        const sparkleY = this.y + Math.sin(angle) * dist;
                        
                        ctx.fillStyle = '#93c5fd';
                        ctx.beginPath();
                        ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // ============================================
        // COIN CLASS
        // ============================================
        class Coin {
            constructor(x, y, value) {
                this.x = x;
                this.y = y;
                this.value = value;
                this.radius = 8;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = 0.1;
            }

            update() {
                if (!game.player) return;

                this.rotation += this.rotationSpeed;

                const dist = Math.sqrt(
                    (this.x - game.player.x) ** 2 + 
                    (this.y - game.player.y) ** 2
                );
                
                // Magnet effect (slightly larger range than XP)
                if (dist < CONFIG.COIN_MAGNET_RADIUS) {
                    const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
                    const speed = 5;
                    this.x += Math.cos(angle) * speed;
                    this.y += Math.sin(angle) * speed;
                }

                // Collection
                if (dist < this.radius + game.player.radius) {
                    game.totalCoins += this.value;
                    updateCoinDisplay();
                    
                    // Play coin sound
                    playSound('coin');
                    
                    // Sparkle effect
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 * i) / 6;
                        game.particles.push(new Particle(
                            this.x, this.y, angle, 2, '#fbbf24', 20
                        ));
                    }
                    
                    const index = game.coins.indexOf(this);
                    if (index > -1) {
                        game.coins.splice(index, 1);
                    }
                }
            }

            draw() {
                const ctx = game.ctx;
                
                // Glow effect
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.radius * 3
                );
                gradient.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
                gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Coin perspective (3D effect)
                const scale = Math.abs(Math.cos(this.rotation));
                ctx.scale(scale, 1);
                
                // Outer rim (darker gold)
                ctx.fillStyle = '#d97706';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner circle (bright gold)
                const innerGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, this.radius * 0.8);
                innerGradient.addColorStop(0, '#fde047');
                innerGradient.addColorStop(1, '#fbbf24');
                ctx.fillStyle = innerGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Coin border/edge
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner detail ring
                ctx.strokeStyle = '#fcd34d';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
                ctx.stroke();
                
                // Dollar sign or value indicator
                ctx.fillStyle = '#92400e';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', 0, 0);
                
                // Shine/sparkle effect
                if (scale > 0.5) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.beginPath();
                    ctx.arc(-this.radius * 0.3, -this.radius * 0.4, this.radius * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.beginPath();
                    ctx.arc(this.radius * 0.2, this.radius * 0.3, this.radius * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
        }

        function updateCoinDisplay() {
            document.getElementById('coinDisplay').textContent = `💰 ${game.totalCoins}`;
        }

        // ============================================
        // PARTICLE CLASS
        // ============================================
        class Particle {
            constructor(x, y, angle, speed, color, life) {
                this.x = x;
                this.y = y;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.color = color;
                this.life = life;
                this.maxLife = life;
                this.radius = 3;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= 0.95;
                this.vy *= 0.95;
                this.life--;

                if (this.life <= 0) {
                    const index = game.particles.indexOf(this);
                    if (index > -1) {
                        game.particles.splice(index, 1);
                    }
                }
            }

            draw() {
                const ctx = game.ctx;
                const alpha = this.life / this.maxLife;
                
                ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ============================================
        // DAMAGE TEXT CLASS
        // ============================================
        class DamageText {
            constructor(x, y, damage, isCritical = false) {
                this.x = x + (Math.random() - 0.5) * 20; // Random offset
                this.y = y;
                this.damage = Math.floor(damage);
                this.isCritical = isCritical;
                this.life = 60; // 1 second at 60fps
                this.maxLife = 60;
                this.vy = isCritical ? -3 : -2; // Float upward faster if crit
                this.vx = (Math.random() - 0.5) * 1; // Slight horizontal drift
                this.scale = isCritical ? 1.5 : 1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy *= 0.95; // Slow down vertical movement
                this.life--;

                if (this.life <= 0) {
                    const index = game.damageTexts.indexOf(this);
                    if (index > -1) {
                        game.damageTexts.splice(index, 1);
                    }
                }
            }

            draw() {
                const ctx = game.ctx;
                const alpha = Math.min(1, this.life / 20); // Fade out in last 20 frames
                
                ctx.save();
                
                // Scale and pulse effect for critical
                if (this.isCritical) {
                    const pulse = 1 + Math.sin(this.life * 0.3) * 0.15;
                    this.scale = 1.5 * pulse;
                }
                
                ctx.translate(this.x, this.y);
                ctx.scale(this.scale, this.scale);
                ctx.translate(-this.x, -this.y);
                
                const fontSize = this.isCritical ? 22 : 16;
                
                // Shadow for readability
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(this.damage, this.x + 2, this.y + 2);
                
                // Main text
                if (this.isCritical) {
                    // Golden color for crits
                    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#fbbf24';
                    
                    // Draw "CRIT!" text above damage
                    ctx.font = `bold 10px Arial`;
                    ctx.fillText('CRIT!', this.x, this.y - 15);
                    
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.fillText(this.damage, this.x, this.y);
                    
                    // Extra glow
                    ctx.shadowBlur = 20;
                    ctx.fillText(this.damage, this.x, this.y);
                } else {
                    // White for normal damage
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.fillText(this.damage, this.x, this.y);
                }
                
                ctx.restore();
            }
        }

        // ============================================
        // INPUT HANDLING
        // ============================================
        const canvas = game.canvas;

        // Scroll-based movement
        canvas.addEventListener('wheel', (e) => {
            if (!game.running || game.paused) return;
            e.preventDefault();
            
            game.movement.dx += e.deltaX * 0.06;
            game.movement.dy += e.deltaY * 0.06;
            
            // Cap speed
            const maxSpeed = 20;
            const currentSpeed = Math.sqrt(
                game.movement.dx ** 2 + game.movement.dy ** 2
            );
            if (currentSpeed > maxSpeed) {
                game.movement.dx = (game.movement.dx / currentSpeed) * maxSpeed;
                game.movement.dy = (game.movement.dy / currentSpeed) * maxSpeed;
            }
        }, { passive: false });

        // Touch support
        let touchStartX = 0, touchStartY = 0;
        let lastTouchX = 0, lastTouchY = 0;
        let isTouching = false;

        canvas.addEventListener('touchstart', (e) => {
            if (!game.running || game.paused) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            touchStartX = lastTouchX = touch.clientX;
            touchStartY = lastTouchY = touch.clientY;
            isTouching = true;
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (!game.running || game.paused || !isTouching) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;
            
            game.movement.dx += deltaX * 0.4;
            game.movement.dy += deltaY * 0.4;
            
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            
            // Cap speed
            const maxSpeed = 20;
            const currentSpeed = Math.sqrt(
                game.movement.dx ** 2 + game.movement.dy ** 2
            );
            if (currentSpeed > maxSpeed) {
                game.movement.dx = (game.movement.dx / currentSpeed) * maxSpeed;
                game.movement.dy = (game.movement.dy / currentSpeed) * maxSpeed;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            isTouching = false;
        }, { passive: false });

        // Mouse drag support
        let isDragging = false;
        let lastMouseX = 0, lastMouseY = 0;

        canvas.addEventListener('mousedown', (e) => {
            if (!game.running || game.paused) return;
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            
            game.movement.dx += deltaX * 0.25;
            game.movement.dy += deltaY * 0.25;
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            
            // Cap speed
            const maxSpeed = 20;
            const currentSpeed = Math.sqrt(
                game.movement.dx ** 2 + game.movement.dy ** 2
            );
            if (currentSpeed > maxSpeed) {
                game.movement.dx = (game.movement.dx / currentSpeed) * maxSpeed;
                game.movement.dy = (game.movement.dy / currentSpeed) * maxSpeed;
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        // ============================================
        // POWER-UP SELECTION
        // ============================================
        function showPowerupSelection() {
            game.paused = true;
            
            // Generate 5 random power-up options
            const options = generatePowerupOptions(5);
            
            const container = document.getElementById('powerupOptions');
            container.innerHTML = '';
            
            options.forEach(powerupId => {
                const definition = POWERUP_TYPES[powerupId];
                const currentLevel = game.player.powerups.has(powerupId) 
                    ? game.player.powerups.get(powerupId).level 
                    : 0;
                
                const card = document.createElement('div');
                card.className = 'powerup-card' + (definition.isEvolved ? ' evolved' : '');
                
                card.innerHTML = `
                    <div class="powerup-icon">${definition.icon}</div>
                    <div class="powerup-name">${definition.name}</div>
                    <div class="powerup-level">Level ${currentLevel + 1}</div>
                    <div class="powerup-desc">${definition.description}</div>
                `;
                
                card.addEventListener('click', () => {
                    selectPowerup(powerupId);
                });
                
                container.appendChild(card);
            });
            
            document.getElementById('powerupScreen').classList.add('show');
        }

        function generatePowerupOptions(count) {
            const available = [];
            const ownedWeapons = [];
            
            // Separate owned weapons for probability boost
            game.player.powerups.forEach((powerup, id) => {
                const definition = POWERUP_TYPES[id];
                if (definition.type === 'weapon' && !definition.isEvolved) {
                    ownedWeapons.push(id);
                }
            });
            
            // Add all power-ups that aren't maxed
            Object.keys(POWERUP_TYPES).forEach(id => {
                const definition = POWERUP_TYPES[id];
                
                // Skip evolved forms unless already owned
                if (definition.isEvolved && !game.player.powerups.has(id)) {
                    return;
                }
                
                // Check if not maxed
                const current = game.player.powerups.get(id);
                if (!current || current.level < definition.maxLevel) {
                    // Add owned weapons multiple times for 30% higher probability
                    if (ownedWeapons.includes(id)) {
                        available.push(id);
                        available.push(id); // 2x chance
                        available.push(id); // 3x chance (roughly 30% boost)
                    } else {
                        available.push(id);
                    }
                }
            });
            
            // Shuffle and return unique items
            const shuffled = available.sort(() => Math.random() - 0.5);
            const unique = [];
            const seen = new Set();
            
            for (const id of shuffled) {
                if (!seen.has(id)) {
                    unique.push(id);
                    seen.add(id);
                }
                if (unique.length >= count) break;
            }
            
            return unique;
        }

        function selectPowerup(powerupId) {
            game.player.addPowerup(powerupId);
            
            document.getElementById('powerupScreen').classList.remove('show');
            game.paused = false;
        }

        // ============================================
        // COMBO SYSTEM
        // ============================================
        function updateCombo() {
            game.comboCount++;
            game.comboTimer = CONFIG.COMBO_TIMEOUT;
            
            // Determine combo tier
            let newTier = 0;
            for (let i = 0; i < CONFIG.COMBO_TIERS.length; i++) {
                if (game.comboCount >= CONFIG.COMBO_TIERS[i]) {
                    newTier = i + 1;
                }
            }
            
            // Show combo display
            const comboDisplay = document.getElementById('comboDisplay');
            comboDisplay.style.display = 'block';
            comboDisplay.textContent = `COMBO x${game.comboCount}`;
            
            // Update tier styling
            comboDisplay.className = '';
            if (newTier >= 5) comboDisplay.classList.add('tier5');
            else if (newTier >= 4) comboDisplay.classList.add('tier4');
            else if (newTier >= 3) comboDisplay.classList.add('tier3');
            else if (newTier >= 2) comboDisplay.classList.add('tier2');
            
            game.comboTier = newTier;
        }

        function resetCombo() {
            game.comboCount = 0;
            game.comboTimer = 0;
            game.comboTier = 0;
            document.getElementById('comboDisplay').style.display = 'none';
        }

        // ============================================
        // SCREEN SHAKE
        // ============================================
        function addScreenShake(intensity) {
            game.screenShake = 15; // Duration in frames
            game.screenShakeIntensity = intensity;
        }

        function applyScreenShake(ctx) {
            if (game.screenShake > 0) {
                const shakeX = (Math.random() - 0.5) * game.screenShakeIntensity;
                const shakeY = (Math.random() - 0.5) * game.screenShakeIntensity;
                ctx.translate(shakeX, shakeY);
                game.screenShake--;
            }
        }

        // ============================================
        // WAVE & SPAWN LOGIC
        // ============================================
        function startWave() {
            // Wave completion bonuses (not for first wave)
            if (game.currentWave > 0 && game.player) {
                // Heal player
                const healAmount = game.player.maxHp * CONFIG.WAVE_COMPLETION_HEAL;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
                game.player.updateUI();
                
                // Bonus coins
                const bonusCoins = CONFIG.WAVE_COMPLETION_BONUS * game.currentWave;
                game.totalCoins += bonusCoins;
                updateCoinDisplay();
                
                // Show wave complete notification
                showWaveComplete(bonusCoins);
            }
            
            game.currentWave++;
            game.waveTimer = 0;
            
            // Update wave display
            document.getElementById('waveDisplay').textContent = `Wave ${game.currentWave}`;
            
            // NEW: Calculate spawn interval based on wave
            // Wave 1: 1 per second (60 frames)
            // Wave 2: 3 per second (20 frames)
            // Wave 3: 5 per second (12 frames)
            // Formula: Spawn every (60 / spawn_rate) frames
            const spawnRate = (game.currentWave * 2) - 1; // 1, 3, 5, 7, 9...
            game.currentSpawnInterval = Math.max(10, Math.floor(60 / spawnRate)); // Min 10 frames (6 per sec max)
            
            console.log(`Wave ${game.currentWave}: Spawn rate = ${spawnRate}/sec, Interval = ${game.currentSpawnInterval} frames`);
            
            // Check if boss wave
            const isBossWave = game.currentWave % CONFIG.BOSS_WAVE_INTERVAL === 0;
            
            if (isBossWave) {
                // Play boss sound
                playSound('boss');
                
                // Spawn boss immediately
                spawnEnemy('boss');
            }
            
            game.spawnTimer = 0;
        }

        function showWaveComplete(bonusCoins) {
            // Create floating text notification
            const notification = document.createElement('div');
            notification.style.position = 'absolute';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.fontSize = '48px';
            notification.style.fontWeight = 'bold';
            notification.style.color = '#10b981';
            notification.style.textShadow = '0 0 20px rgba(16, 185, 129, 1)';
            notification.style.zIndex = '200';
            notification.style.pointerEvents = 'none';
            notification.style.textAlign = 'center';
            notification.innerHTML = `
                WAVE COMPLETE!<br>
                <span style="font-size: 32px; color: #fbbf24;">+${bonusCoins} 💰</span><br>
                <span style="font-size: 24px; color: #10b981;">+30% HP ❤️</span>
            `;
            
            document.getElementById('gameContainer').appendChild(notification);
            
            setTimeout(() => {
                notification.style.transition = 'opacity 0.5s';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 500);
            }, 2000);
        }

        function getEnemyType() {
            // Get spawn weights for current wave
            let weights = { basic: 1.0, fast: 0, tank: 0 };
            
            // Find the appropriate weight tier
            const waveKeys = Object.keys(CONFIG.ENEMY_SPAWN_WEIGHTS)
                .map(k => parseInt(k))
                .sort((a, b) => b - a); // Sort descending
            
            for (const waveThreshold of waveKeys) {
                if (game.currentWave >= waveThreshold) {
                    weights = CONFIG.ENEMY_SPAWN_WEIGHTS[waveThreshold];
                    break;
                }
            }
            
            // Random selection based on weights
            const total = weights.basic + weights.fast + weights.tank;
            const rand = Math.random() * total;
            
            if (rand < weights.basic) return 'basic';
            if (rand < weights.basic + weights.fast) return 'fast';
            return 'tank';
        }

        function spawnEnemy(type = null) {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(side) {
                case 0: x = Math.random() * game.canvas.width; y = -20; break;
                case 1: x = game.canvas.width + 20; y = Math.random() * game.canvas.height; break;
                case 2: x = Math.random() * game.canvas.width; y = game.canvas.height + 20; break;
                case 3: x = -20; y = Math.random() * game.canvas.height; break;
            }
            
            const enemyType = type || getEnemyType();
            game.enemies.push(new Enemy(x, y, enemyType));
        }

        function updateTimer() {
            const seconds = Math.floor(game.gameTime / 60);
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            
            document.getElementById('timerDisplay').textContent = 
                `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        // ============================================
        // GAME LOOP
        // ============================================
        function gameLoop() {
            if (!game.running) return;

            const ctx = game.ctx;
            
            // Clear canvas
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

            // Grid background
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            for (let i = 0; i < game.canvas.width; i += 50) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, game.canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i < game.canvas.height; i += 50) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(game.canvas.width, i);
                ctx.stroke();
            }

            if (!game.paused) {
                // Update game time
                game.gameTime++;
                if (game.gameTime % 60 === 0) {
                    updateTimer();
                }
                
                // Wave timing
                game.waveTimer++;
                if (game.waveTimer >= CONFIG.WAVE_DURATION) {
                    startWave();
                }
                
                // NEW: Continuous spawning based on spawn rate
                // Spawn enemies continuously throughout wave at calculated interval
                game.spawnTimer++;
                if (game.spawnTimer >= game.currentSpawnInterval) {
                    spawnEnemy();
                    game.spawnTimer = 0;
                }
                
                // Apply movement decay
                game.movement.dx *= game.movement.decay;
                game.movement.dy *= game.movement.decay;
                if (Math.abs(game.movement.dx) < 0.1) game.movement.dx = 0;
                if (Math.abs(game.movement.dy) < 0.1) game.movement.dy = 0;
                
                // Update entities
                if (game.player) {
                    game.player.update(game.movement);
                }
                
                game.enemies.forEach(enemy => enemy.update());
                game.projectiles.forEach(proj => proj.update());
                game.xpOrbs.forEach(orb => orb.update());
                game.coins.forEach(coin => coin.update());
                game.particles.forEach(particle => particle.update());
                game.damageTexts.forEach(text => text.update());
                
                // Update combo timer
                if (game.comboTimer > 0) {
                    game.comboTimer--;
                    if (game.comboTimer <= 0) {
                        resetCombo();
                    }
                }
                
            }

            // Apply screen shake
            ctx.save();
            applyScreenShake(ctx);

            // Draw entities
            game.xpOrbs.forEach(orb => orb.draw());
            game.coins.forEach(coin => coin.draw());
            game.particles.forEach(particle => particle.draw());
            
            if (game.player) {
                game.player.draw();
            }
            
            game.enemies.forEach(enemy => enemy.draw());
            game.projectiles.forEach(proj => proj.draw());
            
            // Draw damage texts on top of everything
            game.damageTexts.forEach(text => text.draw());
            
            // Restore context (end screen shake)
            ctx.restore();

            requestAnimationFrame(gameLoop);
        }

        // ============================================
        // GAME CONTROL
        // ============================================
        function startGame() {
            // Show starting power-up selection screen
            document.getElementById('startScreen').classList.remove('show');
            showStartingPowerupSelection();
        }

        function showStartingPowerupSelection() {
            // Show only weapon options for starting selection
            const weaponOptions = [];
            Object.keys(POWERUP_TYPES).forEach(id => {
                const definition = POWERUP_TYPES[id];
                if (definition.type === 'weapon' && !definition.isEvolved) {
                    weaponOptions.push(id);
                }
            });
            
            // Pick 5 random weapons
            const shuffled = weaponOptions.sort(() => Math.random() - 0.5);
            const options = shuffled.slice(0, 5);
            
            const container = document.getElementById('startingPowerupOptions');
            container.innerHTML = '';
            
            options.forEach(powerupId => {
                const definition = POWERUP_TYPES[powerupId];
                
                const card = document.createElement('div');
                card.className = 'powerup-card';
                
                card.innerHTML = `
                    <div class="powerup-icon">${definition.icon}</div>
                    <div class="powerup-name">${definition.name}</div>
                    <div class="powerup-level">Starting Weapon</div>
                    <div class="powerup-desc">${definition.description}</div>
                `;
                
                card.addEventListener('click', () => {
                    selectStartingPowerup(powerupId);
                });
                
                container.appendChild(card);
            });
            
            document.getElementById('startingPowerupScreen').classList.add('show');
        }

        function selectStartingPowerup(powerupId) {
            document.getElementById('startingPowerupScreen').classList.remove('show');
            initializeGame(powerupId);
        }

        function initializeGame(startingPowerupId) {
            // Reset game state
            game.running = true;
            game.paused = false;
            game.gameTime = 0;
            game.enemiesKilled = 0;
            
            // Reset wave system
            game.currentWave = 0;
            game.waveTimer = 0;
            game.spawnTimer = 0;
            game.currentSpawnInterval = 60; // Reset to 1 per second
            
            game.enemies = [];
            game.projectiles = [];
            game.particles = [];
            game.xpOrbs = [];
            game.coins = [];
            game.damageTexts = [];
            
            game.totalCoins = 0;
            updateCoinDisplay();
            
            // Reset combo and effects
            resetCombo();
            game.screenShake = 0;
            game.screenShakeIntensity = 0;
            
            game.movement = { dx: 0, dy: 0, decay: 0.88 };
            
            // Create player
            game.player = new Player(
                game.canvas.width / 2,
                game.canvas.height / 2
            );
            
            // Give selected starting weapon
            game.player.addPowerup(startingPowerupId);
            
            game.player.updateUI();
            updateTimer();
            
            // Start first wave
            startWave();
            
            // Start game loop
            gameLoop();
        }

        function endGame() {
            game.running = false;
            
            // Play death sound
            playSound('death');
            
            // Add coins to lifetime total
            game.lifetimeCoins += game.totalCoins;
            saveGameData();
            updateShopDisplay();
            
            const seconds = Math.floor(game.gameTime / 60);
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            
            document.getElementById('finalTime').textContent = 
                `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            document.getElementById('finalLevel').textContent = game.player.level;
            document.getElementById('finalKills').textContent = game.enemiesKilled;
            document.getElementById('finalCoins').textContent = game.totalCoins;
            
            document.getElementById('gameOverScreen').classList.add('show');
        }

        // ============================================
        // SHOP SYSTEM
        // ============================================
        function updateShopDisplay() {
            document.getElementById('lifetimeCoinsDisplay').textContent = game.lifetimeCoins;
            document.getElementById('shopCoinsDisplay').textContent = game.lifetimeCoins;
            
            // Update damage upgrade
            const damageLevel = game.permanentUpgrades.damage;
            document.getElementById('damageLevel').textContent = damageLevel;
            const damageBtn = document.getElementById('upgradeDamage');
            if (damageLevel >= 5) {
                document.getElementById('damageCost').textContent = 'MAX';
                damageBtn.disabled = true;
                damageBtn.parentElement.classList.add('max-level');
            } else {
                const cost = CONFIG.UPGRADE_COSTS.damage[damageLevel];
                document.getElementById('damageCost').textContent = cost;
                damageBtn.disabled = game.lifetimeCoins < cost;
            }
            
            // Update HP upgrade
            const hpLevel = game.permanentUpgrades.maxHp;
            document.getElementById('maxHpLevel').textContent = hpLevel;
            const hpBtn = document.getElementById('upgradeMaxHp');
            if (hpLevel >= 5) {
                document.getElementById('maxHpCost').textContent = 'MAX';
                hpBtn.disabled = true;
                hpBtn.parentElement.classList.add('max-level');
            } else {
                const cost = CONFIG.UPGRADE_COSTS.maxHp[hpLevel];
                document.getElementById('maxHpCost').textContent = cost;
                hpBtn.disabled = game.lifetimeCoins < cost;
            }
            
            // Update defense upgrade
            const defLevel = game.permanentUpgrades.defense;
            document.getElementById('defenseLevel').textContent = defLevel;
            const defBtn = document.getElementById('upgradeDefense');
            if (defLevel >= 5) {
                document.getElementById('defenseCost').textContent = 'MAX';
                defBtn.disabled = true;
                defBtn.parentElement.classList.add('max-level');
            } else {
                const cost = CONFIG.UPGRADE_COSTS.defense[defLevel];
                document.getElementById('defenseCost').textContent = cost;
                defBtn.disabled = game.lifetimeCoins < cost;
            }
        }

        function buyUpgrade(type) {
            const level = game.permanentUpgrades[type];
            if (level >= 5) return;
            
            const cost = CONFIG.UPGRADE_COSTS[type][level];
            if (game.lifetimeCoins < cost) return;
            
            game.lifetimeCoins -= cost;
            game.permanentUpgrades[type]++;
            
            playSound('coin');
            saveGameData();
            updateShopDisplay();
        }

        // ============================================
        // EVENT LISTENERS
        // ============================================
        document.getElementById('startBtn').addEventListener('click', startGame);
        
        document.getElementById('shopBtn').addEventListener('click', () => {
            document.getElementById('startScreen').classList.remove('show');
            document.getElementById('shopScreen').classList.add('show');
            updateShopDisplay();
        });
        
        document.getElementById('backBtn').addEventListener('click', () => {
            document.getElementById('shopScreen').classList.remove('show');
            document.getElementById('startScreen').classList.add('show');
        });
        
        document.getElementById('upgradeDamage').addEventListener('click', () => buyUpgrade('damage'));
        document.getElementById('upgradeMaxHp').addEventListener('click', () => buyUpgrade('maxHp'));
        document.getElementById('upgradeDefense').addEventListener('click', () => buyUpgrade('defense'));
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            document.getElementById('gameOverScreen').classList.remove('show');
            startGame();
        });
        
        // Initialize audio on first user interaction
        document.addEventListener('click', initAudio, { once: true });
        
        // Update display on load
        updateShopDisplay();
    
