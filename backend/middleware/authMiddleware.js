const protect = (req, res, next) => {
  // JWT-ready placeholder: currently defaults to demo user.
  req.user = { id: "demo-user" };
  next();
};

export { protect };
