var HASH = '#';

function home() {
  return (loggedin ? default_pages[1] : default_pages[0]);
}

function add_hash(name) {
  if (name && name.substring(0,1) != HASH) 
    return HASH + name;

  return name;
}
 
function strip_hash(name) {
  if (name && name.substring(0,1) == HASH) 
    return name.substring(1);

  return name;
}

function fill_and_render(name, obj) {
  var callee = arguments.callee.name + "()";
  logger.debug(callee, "Passed arguments (" + name + ")");
  name = add_hash(name);
  id = strip_hash(name);

  if ($(name).length == 0) {
    logger.warn(callee, "There is no section for " + id);
    return;
  }

  if (!obj) {
    obj = local_get(id);
    logger.info(callee, "Getting local storage object - " + JSON.stringify(obj));
  }

  form = $(name).find('form');
  if (form && obj && Object.keys(obj).length > 0) {
    logger.info(callee, "Attempting to fill form on page '" + name + "'");
    form.values(true, obj);
    data[id] = obj;
  }

  show_section(name);

  return form;
}

function show_section(id) {
  var callee = arguments.callee.name + "()";
  logger.debug(callee, "Passed arguments(" + (id ? id : "") + ")");
  if (!id) 
    return;

  $('section').hide();
  id = add_hash(id);
  if ($('.msg', id).length > 0)
    $('.msg',id).empty().removeClass('alert-danger').removeClass('alert-warning').removeClass('alert-success').hide();

  $(id).show();
  logger.warn(callee, "---------------------------------------------------------------------- " + id + " ---");

  return;
}

function local_get(name) {
  var callee = arguments.callee.name + "()";
  logger.debug(callee, "Passed arguments (" + name + ")");
  if (typeof(Storage) !== "undefined") {
    json = localStorage.getItem(name);
    if (json) {
      logger.info(callee, "Retrieved data for " + name + " = " + json);
      obj = JSON.parse(json);
      return obj;
    }
  }
  return [];
}

function local_set(name, obj) {
  if (typeof(Storage) !== "undefined") {
    localStorage.setItem(name, JSON.stringify(obj));
  }
}

function local_del(name) {
  if (typeof(Storage) !== "undefined") {
    localStorage.removeItem(name);
  }
}

function local_save(el, id) {
  var callee = arguments.callee.name + "()";
  logger.debug(callee, "Passed Arguments (" + el + "," + id + ")");
  obj = $(el).values(false);

  // Strip out data-save="false" values for local_set

  id = strip_hash(id);
  logger.info(callee, "Saving " + id + " = " + JSON.stringify(obj));
  local_set(id, obj);
  data[id] = obj;

  return;
}

function save_default(form, id) {
  var callee = arguments.callee.name + "()";
  logger.debug(callee, "Passed Arguments (form element)");
  local_save($(form), id);
  show_section(home());
}


function ajax_get(req, el) {
  var callee = arguments.callee.name + "()";
  logger.debug(callee, "Passed Arguments (" + JSON.stringify(req) + ", el )");
  if (el)
    $('div.msg', el).removeClass('alert-danger').removeClass('alert-warning').text('').hide();

  token = local_get("token");
  $.ajax({
    method: "POST",
    url:  req.url,
    data: req.data,
    headers: {"X-Token": token},
    success: function(json, textStatus, jqXHR) {
      logger.info(callee, "AJAX success()");
      if (json.res.stat)
        status = json.res.stat;
      else
        status = 500;

      logger.debug(callee, "JSON response [" + status + "] " + JSON.stringify(json));
      if (status != 200) {
        if (json.res.mess && json.res.mess.length > 0) {
          message = json.res.mess[0];
          $('div.msg', el).addClass('alert-danger').text(message.message).show();
          post_function=req.error;
          if (post_function && window[post_function])
            window[post_function](el);
        }
      } else {
        post_function=req.post;
        if (post_function && window[post_function])
          window[post_function](el, json);
      } // 200

    }, // success
    error: function(jqXhr, textStatus, errorThrown ){
      logger.error(callee, "AJAX error() " + textStatus);
      if (el)
        $('div.msg', el).addClass('alert-danger').text('An error occurred obtaining data').show();

      post_function=req.error;
      if (post_function && window[post_function])
        window[post_function](el);

    } // error
  }); // .ajax
  logger.debug(callee, "Post AJAX");
}


function render_hash(default_page) {
  url = window.location.href;
  return render_url(url, default_page);
}

// Function based on snippet from https://gist.github.com/jlong/2428561#file-uri-js
function render_url(url, default_page) {
  var callee = arguments.callee.name + "()";
  logger.debug(callee, "Passed arguments (" + url + ", " + default_page + ")");

  // Contruct a link object to retrieve known url components
  var parser = document.createElement("a");
  parser.href = url;
  if (parser.hash)  {
    var page = parser.hash;
    logger.info(callee, "Found # page from URL of '" + page + "'");
    fill_and_render(page);
    page = strip_hash(page);
    post_function="render_" + page;
    logger.info(callee, "Checking for function " + post_function);
    if (window[post_function])
      window[post_function](page, $(this));
    return page;
  }

  if (default_page) {
    logger.info(callee, "No Hash in URL, rendering default section '" + default_page + "'");
    show_section(default_page);
    post_function="render_" + default_page;
    logger.info(callee, "Checking for function " + post_function);
    if (window[post_function])
      window[post_function](default_page, $(this));
    return default_page;
  }

  return;
}

/*
 *  Generic button/link functions
 *
 *  - render
 *  - save
 *  - cancel
 *
 */

$('.render').click(function(event) {
  event.preventDefault();
  var callee = ".render.click()";
  page = $(this).attr('data-section');
  if (page) {
    logger.info(callee, "Identified button[data-section] = '" + page + "' to render section");
    fill_and_render(page);
    post_function="render_" + page;
    if (window[post_function])
      window[post_function](page, $(this));
  }
  return false;
});

$('.save').click(function(event) {
  var callee = ".save.click()";
  logger.debug(callee, ".save action");

  event.preventDefault();
  var page = $(this).closest('section').attr('id');
  if (!page)
    return;
  var id = add_hash(page);
  logger.info(callee, 'Page identifier ' + id);
  var form = $('form', id);
  if (form.valid()) {
    logger.info(callee, 'Validated Form');
    post_function="save_" + page;
    if (window[post_function])
      window[post_function](form, id, $(this));
    else
      save_default(form, id);
  } else {
    logger.warn(callee, 'Form failed validation');
  }

  return false;
}); // .save

$('.cancel').click(function(event) {
  event.preventDefault();
  var callee = ".cancel.click()";
  logger.debug(callee, ".cancel action");
  show_section(home());
  return false;
});


$('.nav a').on('click', function(){
    $(".navbar-toggle:visible").click();
});

$.fn.values = function(all_data, data) {
  var callee = "[form].values()";
  logger.debug(callee, "Passed arguments (" + (data ? JSON.stringify(data) : "") + ")");

  var form_inputs = $(this).find(":input").get();

  logger.debug(callee, "form_inputs = " + form_inputs);
  // If data is not specified, return the retrieve data
  if (typeof data != "object") {
    data = {};

    $.each(form_inputs, function() {
      if (this.name && (this.checked
        || /select|textarea/i.test(this.nodeName)
        || /text|hidden|password/i.test(this.type))) {
          console.log(this.name + " " + this['data-save']);
          data[this.name] = $(this).val();
      }
   });

   return data;

    // We passed data to populate the form
  } else {
    $.each(form_inputs, function() {
      if (this.name && data[this.name]) {
        if (this.type == "checkbox" || this.type == "radio") {
          $(this).prop("checked", (data[this.name] == $(this).val()));
        } else {
          $(this).val(data[this.name]);
        }
      } else if (this.type == "checkbox") {
        $(this).prop("checked", false);
      }
    });

    return $(this);
  }
}; // .fn.values


(function (window) {

  var Logger = function() {
    if (!(this instanceof Logger)) 
      return new Logger();

    // Class scope variables
    this.callee = "Logger()";
    this.FATAL = "FATAL";
    this.ERROR = "ERROR";
    this.WARN  = "WARN ";
    this.INFO  = "INFO ";
    this.DEBUG = "DEBUG";
    this.LEVELS = [ this.FATAL, this.ERROR, this.WARN, this.INFO, this.DEBUG ];

    this.level(this.INFO);
  };

  function find_array_index(array, value) {
    for (index = 0; index < array.length; index++) {
      if (array[index] == value)
        return index;
    }
    return -1;
  }

  Logger.prototype.level = function(type) {
    if (!type)
      return LEVELS[this.log_level];

    this.info(this.callee, "Setting log_level = " + type);
    this.log_level = find_array_index(this.LEVELS, type);
  }

  Logger.prototype.log = function(type, callee, msg) {
    if (!type || !callee || !msg) {
      console.log(new Date().toLocaleString() + " " + this.ERROR + ": " + this.callee + " An incomplete call for type " + type + " was made.");
      return;
    }

    console.log(new Date().toLocaleString() + " " + type + ": " + callee + " - " + msg);
  }

  Logger.prototype.debug = function(callee, msg) {
    if (this.log_level >= 4) //find_array_index(this.LEVELS, this.DEBUG))
      this.log(this.DEBUG, callee, msg);
  }
  
  Logger.prototype.info = function(callee, msg) {
    if (this.log_level >= 3) //find_array_index(this.LEVELS, this.INFO))
      this.log(this.INFO, callee, msg);
  }

  Logger.prototype.warn = function(callee, msg) {
    if (this.log_level >= 2) //find_array_index(this.LEVELS, this.WARN))
      this.log(this.WARN, callee, msg);
  }
  
  Logger.prototype.error = function(callee, msg) {
    if (this.log_level >= 1) //find_array_index(this.LEVELS, this.ERROR))
      this.log(this.ERROR, callee, msg);
  }
  
  logger = new Logger();
})(this);
