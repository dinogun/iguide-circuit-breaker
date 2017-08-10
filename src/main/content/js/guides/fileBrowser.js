var fileBrowser = (function(){

  // TODO: Map of the step name to content

  var __fileStructure = []; // JSON of the file browser structure
  var __fileBrowserRoot;

  var __create = function(container, content) {
    var fileTree = content.fileBrowser;

    container.append($("<div>").load("../html/guides/fileBrowser.html", function(){
      var fileBrowser = container.find('.fileBrowserContainer');

      __fileBrowserRoot = fileBrowser.find('.fileBrowser');
      fileBrowser.append(__fileBrowserRoot);

      __parseTree(fileTree, null);
      fileBrowser.show();

      __mv("file4", "dir1", null);
    }));
  };

  var __parseTree = function(fileTree, parent){
      if(!fileTree){
        return;
      }
      for(var i = 0; i < fileTree.length; i++){
        var elem = fileTree[i];
        var isDirectory = elem.type === 'directory';
        __addFileElement(elem, parent ? parent.name : null, isDirectory);
        if(isDirectory && elem.files){
          __parseTree(elem.files, elem);
        }
      }
  };

  // TODO return the treeView for the step
  var __getTreeForStep = function(stepName){

  }

  /*
    Find the specified name within the file browser JSON.
    Inputs: {String} name: Name of the file/directory to find.
            {Object} dir: Directory
  */
  var __findElement = function(name, dir){
    var found = null;
    for(var i = 0; i < dir.length; i++){
      var elem = dir[i];
        if(elem.name === name){
          return elem;
        }
        else{
          if(elem.type === 'directory' && elem.files){
            // Check the files/directories under the directory
            found = __findElement(name, elem.files);
            if(found){
              return found;
            }
          }
        }
    }

    // If no elements are found in the directory return null
    return found;
  };

  /*
    Gets the jQuery DOM element using the data-name attribute.
  */
  var __getDomElement = function(name) {
    return $("[data-name='" + name + "']");
  };

  /*
    Insert the file or directory alphabetically into the container array
  */
  var __insertSorted = function($elem, container) {
      var index = 0;
      var val = $elem.text();
      var siblings = container.children();

      // Empty container
      if(siblings.length === 0){
        container.append($elem);
      }
      else{
        while(index < siblings.length && val.localeCompare($(siblings.get(index)).find('.fileBrowseSpan').text()) === 1){
          index++;
        }
        // If reached the end of the siblings then append at the end
        if(index === siblings.length){
          container.append($elem);
        }
        // Otherwise, append the $elem before the first sibling with a greater value
        else{
          var $sibling = $(siblings.get(index));
          $sibling.before($elem);
        }
        // Initially close the added directory
        if($elem.hasClass('fileBrowserDirectory')){
          __closeDirectory($elem);
        }
      }
  };

  /*
      Creates a directory
      Inputs: {String} name: name of directory to create
              {String} parent (optional): Where to create the directory. If not provided, it will create it in the root directory.
   */
  var __mkdir = function(name, parent){
      __addFileElement(name, parent, true);
  };

  /*
    Move a file from src to dest
    Inputs: {String} name: name of file to move
            {String} src: name of source directory
            {String} dest: name of destination directory
  */
  var __mv = function(name, src, dest){
    // Move file structure
    var destElem;
    if(dest){
      destElem = __findElement(dest, __fileStructure);
      if(!destElem){
        console.log("Destination directory does not exist: " + dest);
        return;
      }
    }
    else{
      destElem = __fileStructure;
    }

    var parent;
    if(src){
      parent = __findElement(src, __fileStructure);
      if(!parent || !parent.files){
        console.log("Source directory does not exist: " + src);
        return;
      }
    }
    else{
      parent = __fileStructure;
    }

    // Find the index of the elem in the parent, remove it, and add it to the destination
    var index = parent.files.findIndex(x => x.name === name);
    if(index === -1){
      console.log("File or directory: " + name + " to move does not exist in the source directory");
      return;
    }
    var elem = parent.files.splice(index, 1); // Returns the element and removes it from the parent
    if(destElem.files){
      destElem.files.push(elem);
    }
    else{
      // Root directory
      destElem.push(elem);
    }

    // Move the dom element from the source to destination
    $elem = __getDomElement(name);
    $destElem = dest ? __getDomElement(dest) : __fileBrowserRoot;
    __insertSorted($elem.detach(), $destElem);
    if(!$destElem.is(":visible")){
      $elem.hide();
    }
    else{
      $elem.show();
    }
  };

  /*
    Creates a file or directory and adds it to the file browser.
    Inputs: {String} parent: Name of the parent DOM element.
            {String} name: Name of the new file/directory to be created.
            {Boolean} isDirectory: true if the element will be a directory / false if it is just a file
  */
  var __addFileElement = function(elem, parent, isDirectory){
    var $domElem = $("<div></div");
    var name = elem.name;

    $domElem.attr('aria-label', name);
    $domElem.attr('tabindex', '0');
    $domElem.attr('data-name', name);
    $domElem.addClass('fileBrowserElement');

    var img = $("<span class='fileBrowseIcon'/>");
    if(isDirectory){
      img.addClass('glyphicon glyphicon-folder-close');
    }
    else{
      img.addClass('glyphicon glyphicon-file');
    }
    $domElem.append(img);

    var span = $("<span class='fileBrowseSpan'></span>");
    span.text(name);
    $domElem.append(span);

    var elemStructure = {};
    elemStructure.name = name;
    if(isDirectory){
      elemStructure.type = 'directory';
      elemStructure.files = [];
      $domElem.addClass('fileBrowserDirectory');
    }
    else{
      elemStructure.type = 'file';
      $domElem.addClass('fileBrowserFile');
    }

    __addOnClickListener($domElem);

    // If no parent is specified then create the element under the root level
    if(!parent){
      $domElem.attr('data-treeLevel', 0);
      __fileStructure.push(elemStructure);
      __insertSorted($domElem, __fileBrowserRoot);
    }
    else{
      // Find the parent element in the fileBrowser object
      var parentDir = __findElement(parent, __fileStructure);
      var $parentDomElem = __getDomElement(parent);
      var treeLevel = $parentDomElem.attr('data-treeLevel');
      $domElem.attr('data-treeLevel', treeLevel + 1);
      __insertSorted($domElem, $parentDomElem);

      // Hide the element to start if it is not top-level
      $domElem.hide();

      // Only if the parent is a directory, add the file under it. If the parent is not a directory,
      // then we can't add the new file to it so add it to the root level directory.
      if(parentDir.type === 'directory'){
        parentDir.files.push(elemStructure);
      }
      else{
        __fileStructure.push(elemStructure);
      }
    }
  };

  var __addOnClickListener = function($elem) {
    $elem.on("keydown", function(event){
        event.stopPropagation();
        if(event.which === 13 || event.which === 32){ // Enter key, Space key
          __handleClick($elem);
        }
    });
    $elem.on("dblclick", function(event){
        event.stopPropagation();
        __handleClick($elem);
    });
  };

  var __openDirectory = function($elem){
    $elem.removeClass('directory_collapsed');
    $elem.addClass('directory_expanded');
    $elem.children('.fileBrowserElement').attr('tabindex', '0'); // Using filter selector to only affect the first generation of children
    $elem.children('div').show();

    // Change the directory image to open
    $elem.find('.fileBrowseIcon').first().removeClass('glyphicon-folder-close').addClass('glyphicon-folder-open');
  };

  var __closeDirectory = function($elem){
    // Collapse directory and its children
    $elem.removeClass('directory_expanded');
    $elem.addClass('directory_collapsed');
    $elem.children('.fileBrowserElement').attr('tabindex', '-1'); // Using filter selector to only affect the first generation of children
    $elem.children('div').hide();

    // Change the directory image to closed
    $elem.find('.fileBrowseIcon').first().removeClass('glyphicon-folder-open').addClass('glyphicon-folder-close');
  };

  var __handleClick = function($elem){
    if($elem.hasClass('fileBrowserDirectory')){
      if($elem.hasClass('directory_collapsed')){
        __openDirectory($elem);
      }
      else{
        __closeDirectory($elem);
      }
    }
    else{
      // TODO: Figure out what to do when the user clicks on a file.
    }
  };

  return {
    create: __create,
    addFileElement: __addFileElement,
    mkdir: __mkdir,
    mv: __mv
  }
})();
