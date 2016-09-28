'use strict';


exports.getFile = ({size}) => {
  return {
    get size() {
      return size;
    }
  };
}
