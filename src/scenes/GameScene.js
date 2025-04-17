import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.player = null;
    this.enemies = [];
    this.path = null;
    this.dashButton = null;
    this.chargeButton = null;
    this.joystick = null;
    this.dashCooldown = 0;
    this.chargePower = 0;
    this.isDashing = false;
    this.isCharging = false;
    this.gameOverDialog = null;
  }

  preload() {
    // 加载游戏资源
    this.load.image('background', './assets/background.svg');
    this.load.image('player', './assets/player.svg');
    this.load.image('enemy', './assets/enemy.svg');
    this.load.image('joystick', './assets/joystick.svg');
    this.load.image('button', './assets/button.svg');
  }

  create() {
    // 添加背景
    this.add.image(0, 0, 'background').setOrigin(0);

    // 生成随机路径
    this.generatePath();

    // 创建玩家
    this.player = this.physics.add.sprite(100, 300, 'player');
    this.player.setCollideWorldBounds(true);

    // 创建敌人
    this.createEnemies();

    // 创建控制界面
    this.createControls();

    // 添加键盘控制
    this.cursors = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D'
    });

    // 碰撞检测
    this.enemies.forEach(enemy => {
      this.physics.add.overlap(this.player, enemy, this.handlePlayerEnemyCollision, null, this);
    });
  }

  update(time, delta) {
    // 更新玩家移动
    this.updatePlayerMovement();

    // 更新敌人AI
    this.updateEnemies();

    // 更新技能状态
    this.updateSkills(delta);

    // 检查胜利条件
    this.checkWinCondition();
  }

  generatePath() {
    // 实现随机路径生成逻辑
    this.path = [];
    // TODO: 添加路径生成算法
  }

  createEnemies() {
    // 创建多个敌方机器人
    for (let i = 0; i < 3; i++) {
      const enemy = this.physics.add.sprite(700, 200 + i * 100, 'enemy');
      enemy.setCollideWorldBounds(true);
      this.enemies.push(enemy);
    }
  }

  createControls() {
    // 创建虚拟摇杆
    this.joystick = this.add.image(100, this.game.config.height - 100, 'joystick');
    this.joystick.setInteractive();
    this.input.setDraggable(this.joystick);
    
    // 设置摇杆的初始位置
    this.joystickBase = { x: 100, y: this.game.config.height - 100 };
    
    // 添加拖拽事件
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (gameObject === this.joystick) {
        // 限制摇杆移动范围
        const distance = Phaser.Math.Distance.Between(
          this.joystickBase.x,
          this.joystickBase.y,
          dragX,
          dragY
        );
        const maxDistance = 50;
        
        if (distance > maxDistance) {
          const angle = Phaser.Math.Angle.Between(
            this.joystickBase.x,
            this.joystickBase.y,
            dragX,
            dragY
          );
          dragX = this.joystickBase.x + Math.cos(angle) * maxDistance;
          dragY = this.joystickBase.y + Math.sin(angle) * maxDistance;
        }
        
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    });
    
    this.input.on('dragend', (pointer, gameObject) => {
      if (gameObject === this.joystick) {
        // 松开时摇杆回到初始位置
        gameObject.x = this.joystickBase.x;
        gameObject.y = this.joystickBase.y;
      }
    });

    // 创建技能按钮
    this.dashButton = this.add.image(this.game.config.width - 200, this.game.config.height - 100, 'button');
    this.dashButton.setInteractive();

    this.chargeButton = this.add.image(this.game.config.width - 100, this.game.config.height - 100, 'button');
    this.chargeButton.setInteractive();

    // 添加按钮事件监听
    this.setupControlEvents();
  }

  setupControlEvents() {
    // 实现控制事件处理
    this.dashButton.on('pointerdown', () => {
      this.startDash();
    });

    this.dashButton.on('pointerup', () => {
      this.stopDash();
    });

    this.chargeButton.on('pointerdown', () => {
      this.startCharge();
    });

    this.chargeButton.on('pointerup', () => {
      this.releaseCharge();
    });
  }

  updatePlayerMovement() {
    if (this.isDashing) {
      // 冲刺移动逻辑
      const dashSpeed = 400;
      const angle = Phaser.Math.Angle.Between(
        this.joystickBase.x,
        this.joystickBase.y,
        this.joystick.x,
        this.joystick.y
      );
      this.player.setVelocity(
        Math.cos(angle) * dashSpeed,
        Math.sin(angle) * dashSpeed
      );
    } else {
      // 处理键盘输入
      if (this.cursors) {
        let velocityX = 0;
        let velocityY = 0;
        const speed = 200;

        if (this.cursors.left.isDown) velocityX = -speed;
        if (this.cursors.right.isDown) velocityX = speed;
        if (this.cursors.up.isDown) velocityY = -speed;
        if (this.cursors.down.isDown) velocityY = speed;

        // 如果有键盘输入，使用键盘控制
        if (velocityX !== 0 || velocityY !== 0) {
          // 对角线移动时保持相同速度
          if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= Math.SQRT1_2;
            velocityY *= Math.SQRT1_2;
          }
          this.player.setVelocity(velocityX, velocityY);
          return;
        }
      }

      // 如果没有键盘输入，使用触摸控制
      const distance = Phaser.Math.Distance.Between(
        this.joystickBase.x,
        this.joystickBase.y,
        this.joystick.x,
        this.joystick.y
      );
      
      if (distance > 10) {
        const angle = Phaser.Math.Angle.Between(
          this.joystickBase.x,
          this.joystickBase.y,
          this.joystick.x,
          this.joystick.y
        );
        const speed = 200;
        this.player.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );
      } else {
        this.player.setVelocity(0, 0);
      }
    }
  }

  updateEnemies() {
    // 更新敌人AI行为
    this.enemies.forEach(enemy => {
      // 实现追踪玩家的逻辑
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const speed = 100;
      enemy.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
    });
  }

  updateSkills(delta) {
    // 更新技能冷却时间和状态
    if (this.dashCooldown > 0) {
      this.dashCooldown -= delta;
    }

    if (this.isCharging) {
      this.chargePower = Math.min(this.chargePower + delta / 1000, 5);
    }
  }

  startDash() {
    if (this.dashCooldown <= 0) {
      this.isDashing = true;
      // 实现冲刺逻辑
    }
  }

  stopDash() {
    if (this.isDashing) {
      this.isDashing = false;
      const dashDuration = 1; // 秒
      this.dashCooldown = dashDuration * 3000; // 设置冷却时间
    }
  }

  startCharge() {
    this.isCharging = true;
    this.chargePower = 0;
  }

  releaseCharge() {
    if (this.isCharging) {
      this.isCharging = false;
      // 实现蓄力炮发射逻辑
      this.chargePower = 0;
    }
  }

  handlePlayerEnemyCollision(player, enemy) {
    // 设置碰撞距离阈值
    const collisionThreshold = 50;
    
    // 计算玩家和敌人之间的实际距离
    const distance = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      enemy.x,
      enemy.y
    );
    
    // 只有当实际距离小于阈值时才判定为碰撞
    if (distance < collisionThreshold) {
      this.showGameOverDialog('游戏结束');
    }
  }

  checkWinCondition() {
    // 检查是否到达终点
    // TODO: 实现胜利条件检查
    // 当达到胜利条件时
    // this.showGameOverDialog('恭喜获胜');
  }

  showGameOverDialog(message) {
    // 停止所有游戏对象的移动
    this.physics.pause();

    // 创建半透明黑色背景
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    overlay.setDepth(100);

    // 创建对话框背景
    const dialogWidth = 500;
    const dialogHeight = 300;
    const dialog = this.add.graphics();
    dialog.setDepth(101);

    // 添加圆角矩形和阴影效果
    dialog.lineStyle(2, 0x4a4a4a, 1);
    dialog.fillStyle(0x333333, 1);
    
    // 绘制阴影
    dialog.fillStyle(0x000000, 0.3);
    dialog.fillRoundedRect(
      this.cameras.main.centerX - dialogWidth/2 + 5,
      this.cameras.main.centerY - dialogHeight/2 + 5,
      dialogWidth,
      dialogHeight,
      20
    );
    
    // 绘制主对话框
    dialog.fillStyle(0x333333, 1);
    dialog.fillRoundedRect(
      this.cameras.main.centerX - dialogWidth/2,
      this.cameras.main.centerY - dialogHeight/2,
      dialogWidth,
      dialogHeight,
      20
    );

    // 添加消息文本
    const text = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 60,
      message,
      {
        fontSize: '36px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        align: 'center'
      }
    );
    text.setOrigin(0.5);
    text.setDepth(102);

    // 创建重新开始按钮
    const button = this.add.graphics();
    button.setDepth(102);
    
    const buttonWidth = 240;
    const buttonHeight = 60;
    const buttonX = this.cameras.main.centerX - buttonWidth/2;
    const buttonY = this.cameras.main.centerY + 40;
    
    // 按钮交互区域
    const buttonHitArea = new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight);
    const buttonInteractive = this.add.rectangle(buttonX + buttonWidth/2, buttonY + buttonHeight/2, buttonWidth, buttonHeight, 0x00ff00, 0);
    buttonInteractive.setInteractive({ cursor: 'pointer' });

    // 绘制按钮
    const drawButton = (fillColor) => {
      button.clear();
      button.fillStyle(fillColor, 1);
      button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    };

    // 默认状态
    drawButton(0x00ff00);

    // 添加按钮文本
    const buttonText = this.add.text(
      this.cameras.main.centerX,
      buttonY + buttonHeight/2,
      '重新开始',
      {
        fontSize: '28px',
        fill: '#000000',
        fontFamily: 'Arial',
        fontWeight: 'bold'
      }
    );
    buttonText.setOrigin(0.5);
    buttonText.setDepth(103);

    // 添加按钮交互效果
    buttonInteractive.on('pointerover', () => {
      drawButton(0x33ff33);
      this.game.canvas.style.cursor = 'pointer';
    });

    buttonInteractive.on('pointerout', () => {
      drawButton(0x00ff00);
      this.game.canvas.style.cursor = 'default';
    });

    buttonInteractive.on('pointerdown', () => {
      drawButton(0x00cc00);
    });

    buttonInteractive.on('pointerup', () => {
      drawButton(0x33ff33);
      
      // 移除所有事件监听器
      buttonInteractive.removeAllListeners();
      
      // 重置游戏状态
      this.player.setVelocity(0, 0);
      this.enemies.forEach(enemy => enemy.setVelocity(0, 0));
      
      // 清理对话框UI组件（从内到外）
      buttonText.destroy();
      button.destroy();
      text.destroy();
      dialog.destroy();
      overlay.destroy();
      buttonInteractive.destroy();
      
      // 恢复物理系统
      this.physics.resume();
      
      // 刷新页面以完全重置游戏状态
      window.location.reload()
    });

    // 保存对话框引用以便后续管理
    this.gameOverDialog = {
      overlay,
      dialog,
      text,
      button,
      buttonText
    };
  }
}