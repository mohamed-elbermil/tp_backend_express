function errorHandler(err, req, res, next) {
    console.error("🔥 Erreur serveur :", err); // log complet côté serveur
    res.status(500).json({ message: "Erreur interne du serveur" }); // générique côté client
  }
  
  module.exports = errorHandler;
  