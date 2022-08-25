const express = require('express');

const { isLoggedIn } = require('./middlewares');
const User = require('../models/user');
const Post = require('../models/post');
const db = require('../models');
const router = express.Router();

router.post('/:id/follow', isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (user) {
      await user.addFollowing(parseInt(req.params.id, 10));
      res.send('success');
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.post('/:id/unfollow', isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (user) {
      await db.sequelize.models.Follow.destroy({ where: { followerId: req.user.id, followingId: req.params.id } });
      res.send('unfollowing success');
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.post('/:id/like', isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    const post = await Post.findOne({ where: { id: req.params.id } });

    if (user && post) {
      await user.addLikings(parseInt(req.params.id, 10));
      res.send('Like success');
    } else {
      res.status(404).send('no user && post');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.post('/:id/unlike', isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    const post = await Post.findOne({ where: { id: req.params.id } });

    if (user && post) {
      await db.sequelize.models.UserLikePost.destroy({ where: { UserId: req.user.id, PostId: req.params.id } });
      res.send('unlike success');
    } else {
      res.status(404).send('no user && post');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete('/:id', isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (user) {
      await Post.destroy({ where: {id: req.params.id}});
      res.send('delete success');
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});
module.exports = router;
