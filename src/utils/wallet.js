/**
 * @file get wallet instance
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const inquirer = require('inquirer');
const Registry = require('../rc/index');
const {
  passwordPrompts
} = require('./constants');
const BaseSubCommand = require('../command/baseSubCommand');

function getWallet(commandRoot, address, password) {
  const keyStoreFile = path.resolve(commandRoot, `keys/${address}.json`);
  const keyStore = JSON.parse(Registry.getFileOrNot(keyStoreFile, '{}').toString());
  if (Object.keys(keyStore).length === 0) {
    throw new Error('Make sure you entered the correct account address');
  }
  try {
    const { privateKey } = AElf.wallet.keyStore.unlockKeystore(keyStore, password);
    return AElf.wallet.getWalletByPrivateKey(privateKey);
  } catch (e) {
    throw new Error('Make sure you entered the correct password');
  }
}

async function saveKeyStore(wallet, datadir, cipher = 'aes-128-ctr') {
  const {
    password,
    confirmPassword
  } = BaseSubCommand.normalizeConfig(await inquirer.prompt(passwordPrompts));
  if (password !== confirmPassword) {
    throw new Error('Passwords are different');
  }
  if (password.length <= 6) {
    throw new Error('password is too short');
  }
  const keyStore = AElf.wallet.keyStore.getKeystore(wallet, password, {
    cipher
  });
  const keyStorePath = path.resolve(datadir, `keys/${wallet.address}.json`);
  if (!fs.existsSync(path.resolve(datadir, 'keys'))) {
    mkdirp.sync(path.resolve(datadir, 'keys'));
  }
  fs.writeFileSync(
    keyStorePath,
    JSON.stringify(keyStore, null, 2)
  );
  return keyStorePath;
}

module.exports = {
  getWallet,
  saveKeyStore
};
