import swaggerAutogen from 'swagger-autogen';
import fs from 'fs';

const doc = {
  info: {
    title: 'Admin APIs',
    description: 'JWT Token format: "Bearer <your_token_here>"',
  },
  servers: [
    { url: 'http://localhost:3003/api/admin' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Format: Bearer <JWT_Token>'
      }
    }
  },
  security: [{ bearerAuth: [] }]
};

const outputFile = './swagger/admin-swagger.json';
const endpointsFiles = ['./src/modules/admin/admin.routes.js'];

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc).then(() => {
    const swaggerData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    
    // Group endpoints into tags based on the first URL segment
    for (const path in swaggerData.paths) {
        const segments = path.split('/').filter(Boolean);
        let tag = segments.length > 0 ? segments[0] : 'default';
        
        // Capitalize the tag for better readability
        tag = tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ');
        
        for (const method in swaggerData.paths[path]) {
            swaggerData.paths[path][method].tags = [tag];
        }
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(swaggerData, null, 2));
    console.log("Admin Swagger documentation generated and tagged at ./swagger/admin-swagger.json");
});
