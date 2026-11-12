// Servidor de desarrollo de la PWA «Ruta del Café».
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(PUBLIC));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ruta del Café escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;
