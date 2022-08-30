const Sequelize = require('sequelize');

module.exports = class Chat extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      user: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      whisperto: {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: ""
      },
      chat : {
        type: Sequelize.TEXT,
      },
      gif: {
        type : Sequelize.TEXT,
      },
    }, {
      sequelize,
      timestamps: true,
      underscored: false,
      modelName: 'Chat',
      tableName: 'chats',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.Chat.belongsTo(db.Room, {onDelete: 'CASCADE'});
  }
};
