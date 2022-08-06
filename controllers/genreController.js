const { body, validationResult } = require("express-validator");
var async = require('async');

var Genre = require('../models/genre');
var Book = require('../models/book');


// Display list of all Genre.
exports.genre_list = function(req, res) {
    Genre.find()
        .sort([['name', 'ascending']])
        .exec(function (err, result_list) {
            if (err) { return next(err); }
            //Successful, so render
            res.render('genre_list', { title: 'genre List', genre_list: result_list });
          });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
  // query the genre name and its associated books in parallel, with the callback rendering the page when (if) both requests complete successfully.
    async.parallel({
        genre(callback) {
            Genre.findById(req.params.id)
              .exec(callback);
        },

        genre_books(callback) {
            Book.find({ 'genre': req.params.id })
              .exec(callback);
        },

    }, function(err, results) {
        if (err) { return next(err); }
        if (results.genre==null) { // No results.
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        res.render('genre_detail', {
          title: 'Genre Detail',
          genre: results.genre,
          genre_books: results.genre_books,
        });
    });

};

// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
    res.render("genre_form", { title: "Create Genre" });
};
  
// Handle Genre create on POST.
exports.genre_create_post = [
    // Validate and sanitize the name field.
    body("name", "Genre name required").trim().isLength({ min: 1 }).escape(),
  
    // Process request after validation and sanitization.
    (req, res, next) => {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
  
      // Create a genre object with escaped and trimmed data.
      const genre = new Genre({ name: req.body.name });
  
      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values/error messages.
        res.render("genre_form", {
          title: "Create Genre",
          genre,
          errors: errors.array(),
        });
        return;
      } else {
        // Data from form is valid.
        // Check if Genre with same name already exists.
        Genre.findOne({ name: req.body.name }).exec((err, found_genre) => {
          if (err) {
            return next(err);
          }

          if (found_genre) {
            // Genre already exists, redirect to its detail page.
            res.redirect(found_genre.url);
          } else {
            // Genre doesn't already exist, save the new genre
            genre.save((err) => {
              if (err) {
                return next(err);
              }
              // Genre saved. Redirect to the detail page of the new genre.
              res.redirect(genre.url);
            });
          }
        });
      }
    },
  ];
  
// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
  async.parallel({
    genre(callback) {
      Genre.findById(req.params.id).exec(callback)
    },
    genre_books(callback) {
      Book.find({ 'genre': req.params.id}).exec(callback)
    }
  }, function(err, results) {
    if (err) { return next(err); }
    if (results.genre==null) { // No results.
      res.redirect('/catalog/genres')
    }
    // Successful, so render.
    res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
  });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
  async.parallel({
    genre(callback) {
      Genre.findById(req.params.genreId).exec(callback)
    },
    genre_books(callback) {
      Book.find({ 'genre': req.params.genreId}).exec(callback)
    }
  }, function(err, results) {
    if (err) { return next(err); }
    // Success
    if (results.genre_books.length > 0) {
      // Genre has books. Render in the same way as GET route.
      res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
      return;
    } else {
      // Genre has no books. Delete object and redirect to the list of genres.
      Genre.findByIdAndRemove(req.body.genreId, function deleteGenre(err) {
        if (err) { return next(err); }
        // Success - go to genre list
        res.redirect('/catalog/genres');
      });
    }
  });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
    Genre.findById(req.params.id, function(err, genre) {
      if (err) { return next(err); }
      if (genre == null) { // No results.
        var err = new Error('Genre not found');
        err.status = 404;
        return next(err);
      }
      // Success.
      res.render('genre_form', { title: 'Update Genre', genre: genre });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name must contain at least 3 characters").trim().isLength({ min: 3 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data and old id.
    const newGenre = new Genre({ name: req.body.name, _id: req.params.id });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("genre_form", {
        title: "Update Genre",
        genre: newGenre,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid. Update the record.
      Genre.findByIdAndUpdate(req.params.id, newGenre, {}).exec((err, thegenre) => {
        if (err) {
          return next(err);
        }
        // Successful - redirect to genre detail page.
        res.redirect(thegenre.url);
      });
    }
  },
];
