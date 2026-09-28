import SwaggerParser from "@apidevtools/swagger-parser";

import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import yaml from 'js-yaml'; // Install this instead of yamljs

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the OpenAPI spec
// const yamlFile = readFileSync(path.join(__dirname, '../../openapi.yaml'), 'utf8');
// const swaggerDocument = yaml.load(yamlFile);


// const yamlFileSwagger = readFileSync(path.join(__dirname, '../../swagger/swagger.yaml'), 'utf8');
// const swaggerDocumentNew = yaml.load(yamlFileSwagger);

// Custom Swagger options
const options = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Solfana API Documentation",
  explorer: true
};

export default async (app) => {
  const mainSpecPath = path.join(__dirname, "../../swagger/swagger.yaml");
  const adminSpecPath = path.join(__dirname, '../../swagger/admin-swagger.json');

  app.use(
    "/mobile-api-docs",
    swaggerUi.serveFiles(null, {
      swaggerOptions: {
        url: "/openapi.json"
      }
    }),
    swaggerUi.setup(null, {
      ...options,
      swaggerOptions: {
        url: "/openapi.json"
      }
    })
  );
  
  // const api = await SwaggerParser.bundle(
  //   path.join(__dirname, "../../swagger/swagger.yaml")
  // );

  // app.use(
  //   "/mobile-api-docs",
  //   swaggerUi.serveFiles(api, options),
  //   swaggerUi.setup(api, options)
  // );

  // Serve admin Swagger UI
  app.use(
    "/api-docs-admin",
    swaggerUi.serveFiles(null, {
      swaggerOptions: {
        url: "/openapi-admin.json"
      }
    }),
    swaggerUi.setup(null, {
      ...options,
      swaggerOptions: {
        url: "/openapi-admin.json"
      }
    })
  );
  
  // Serve raw spec files
  app.get('/openapi.yaml', (req, res) => {
    res.sendFile(mainSpecPath);
  });

  app.get('/openapi-admin.json', async (req, res, next) => {
    try {
      const adminSwagger = JSON.parse(readFileSync(adminSpecPath, 'utf8'));
      res.json(adminSwagger);
    } catch (error) {
      next(error);
    }
  });

  // app.get('/openapi.json', async (req, res, next) => {
  //   try {
  //     const api = await SwaggerParser.bundle(mainSpecPath);
  //     res.json(api);
  //   } catch (error) {
  //     next(error);
  //   }
  // });

  app.get('/openapi.json', async (req, res, next) => {
    try {
      const api = await SwaggerParser.bundle(mainSpecPath);

      api.servers = [
        {
          url: `${process.env.APP_URL}`,
          description: process.env.NODE_ENV || 'Current Environment'
        }
      ];

      res.json(api);
    } catch (error) {
      next(error);
    }
  });
};
