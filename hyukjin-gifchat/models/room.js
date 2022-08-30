const Sequelize = require('sequelize');

module.exports = class Room extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      title: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      max: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 10,
        validate: {
          min: 2,
        },
      },
      owner : {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      password: {
        type: Sequelize.TEXT,
      },
    }, {
      sequelize,
      timestamps: true,
      underscored: false,
      modelName: 'Room',
      tableName: 'rooms',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.Room.hasMany(db.Chat, {onDelete: 'CASCADE'});
  }
};
