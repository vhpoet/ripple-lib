'use strict';

//
// Seed support
//

const {KeyPair, KeyType} = require('ripple-keypairs');
const {decodeSeed, encodeSeed} = require('ripple-address-codec');
const extend = require('extend');
const sjclcodec = require('sjcl-codec');
const BN = require('bn.js');
const hashjs = require('hash.js');

const UInt = require('./uint').UInt;

const Seed = extend(function() {
  this._value = NaN;
  this._type = KeyType.secp256k1;
}, UInt);

Seed.width = 16;
Seed.prototype = extend({}, UInt.prototype);
Seed.prototype.constructor = Seed;

// value = NaN on error.
// One day this will support rfc1751 too.
Seed.prototype.parse_json = function(j) {
  if (typeof j === 'string') {
    if (!j.length) {
      this._value = NaN;
    } else {
      this.parse_base58(j);
      if (!this.is_valid()) {
        this.parse_hex(j);
        // XXX Should also try 1751
      }
      if (!this.is_valid() && j[0] !== 's') {
        this.parse_passphrase(j);
      }
    }
  } else {
    this._value = NaN;
  }

  return this;
};

Seed.prototype.parse_base58 = function(j) {
  if (typeof j !== 'string') {
    throw new Error('Value must be a string');
  }
  if (!j.length || j[0] !== 's') {
    this._value = NaN;
  } else {
    try {
      const {bytes, type} = decodeSeed(j);
      this._value = new BN(bytes);
      this._type = type;
    } catch (e) {
      this._value = NaN;
    }
  }
  return this;
};

Seed.prototype.set_ed25519 = function() {
  this._type = KeyType.ed25519;
  return this;
};

Seed.prototype.parse_passphrase = function(j) {
  if (typeof j !== 'string') {
    throw new Error('Passphrase must be a string');
  }

  const phraseBytes = sjclcodec.bytes.fromBits(sjclcodec.utf8String.toBits(j));
  const hash = hashjs.sha512().update(phraseBytes).digest();
  this.parse_bytes(hash.slice(0, 16));

  return this;
};

Seed.prototype.to_json = function() {
  if (!(this.is_valid())) {
    return NaN;
  }
  return encodeSeed(this.to_bytes(), this._type);
};

Seed.prototype.get_key = function() {
  if (!this.is_valid()) {
    throw new Error('Cannot generate keys from invalid seed!');
  }
  return KeyPair.fromSeed(this.to_bytes(), this._type);
};

exports.Seed = Seed;
