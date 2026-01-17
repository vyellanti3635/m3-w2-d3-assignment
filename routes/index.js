const express = require('express');
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const Registration = mongoose.model('Registration');

const validateCredentials = (username, password) => {
  try {
    const htpasswdPath = path.join(__dirname, '../users.htpasswd');
    const htpasswdContent = fs.readFileSync(htpasswdPath, 'utf8');
    const lines = htpasswdContent.trim().split('\n');
    
    for (const line of lines) {
      const [user, hash] = line.split(':');
      if (user === username) {
        if (hash.startsWith('{SHA}')) {
          const expectedHash = hash.substring(5);
          const actualHash = crypto.createHash('sha1').update(password).digest('base64');
          return actualHash === expectedHash;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error reading htpasswd file:', error);
    return false;
  }
};

const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Private Area"');
    return res.status(401).send('Authentication required');
  }
  
  const credentials = Buffer.from(auth.slice(6), 'base64').toString().split(':');
  const username = credentials[0];
  const password = credentials[1];
  
  if (validateCredentials(username, password)) {
    next();
  } else {
    res.set('WWW-Authenticate', 'Basic realm="Private Area"');
    return res.status(401).send('Invalid credentials');
  }
};

router.get('/', (req, res) => {
  res.render('form', { title: 'Registration Form' });
});

router.get('/registrations', basicAuth, (req, res) => {
  Registration.find()
    .then((registrations) => {
      res.render('index', { title: 'Listing registrations', registrations });
    })
    .catch(() => { res.send('Sorry! Something went wrong.'); });
});

router.post('/', [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Valid email is required')
], (req, res) => {
  const errors = validationResult(req);
  
  if (errors.isEmpty()) {
    const registration = new Registration(req.body);
    registration.save()
      .then(() => {
        res.render('form', { 
          title: 'Registration Form',
          success: 'Thank you for your registration!',
          data: {} // Clear form data on success
        });
      })
      .catch((err) => {
        console.log(err);
        res.render('form', {
          title: 'Registration Form',
          errors: [{ msg: 'Sorry! Something went wrong.' }],
          data: req.body
        });
      });
  } else {
    res.render('form', {
      title: 'Registration Form',
      errors: errors.array(),
      data: req.body
    });
  }
});

module.exports = router;