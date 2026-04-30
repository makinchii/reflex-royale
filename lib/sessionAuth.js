const User = require("../models/User");

function createSession(req, user) {
  if (!req.session) return;
  req.session.user = {
    id: String(user._id),
    username: user.username,
  };
}

function destroySession(req, res, onDone) {
  if (!req.session) {
    if (typeof onDone === "function") onDone();
    return;
  }

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    if (typeof onDone === "function") onDone();
  });
}

async function getCurrentUser(req) {
  const userId = req.session?.user?.id;
  if (!userId) return null;
  return User.findById(userId);
}

async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "You must be logged in to update your leaderboard score.",
    });
  }

  req.currentUser = user;
  return next();
}

module.exports = {
  createSession,
  destroySession,
  getCurrentUser,
  requireAuth,
};
