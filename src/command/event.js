/**
 * @file Deserialize transactions result Logs
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const BaseSubCommand = require('./baseSubCommand');
const {
  commonGlobalOptionValidatorDesc,
  eventCommandParameters,
  eventCommandUsage
} = require('../utils/constants');
const {
  logger,
  plainLogger
} = require('../utils/myLogger');

class EventCommand extends BaseSubCommand {
  constructor(rc) {
    super(
      'event',
      eventCommandParameters,
      'Deserialize the result return by executing a transaction',
      [],
      eventCommandUsage,
      rc,
      commonGlobalOptionValidatorDesc
    );
  }

  async run(commander, ...args) {
    const {
      options,
      subOptions
    } = await super.run(commander, ...args);
    const {
      endpoint
    } = options;
    try {
      const {
        txId
      } = subOptions;
      const aelf = new AElf(new AElf.providers.HttpProvider(endpoint));
      const txResult = await aelf.chain.getTxResult(txId);
      // console.log(plainLogger.info(`Transaction ${txId}'s Logs: \n ${JSON.stringify(txResult.Logs, null, 2)}`));
      if (!txResult.Logs) {
        console.log(plainLogger.info(`Transaction ${txId} returns void`));
      } else {
        this.oraInstance.start('Deserialize Transaction Logs...');
        const logs = txResult.Logs;
        // const logsResult = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const [index, log] of Object.entries(logs)) {
          const {
            Address: contractAddress,
            Name: dataTypeName,
            NonIndexed: data
          } = log;
          // eslint-disable-next-line no-await-in-loop
          const fileDescriptor = await aelf.chain.getContractFileDescriptorSet(contractAddress);
          const dataType = AElf.pbjs.Root.fromDescriptor(fileDescriptor).lookupType(dataTypeName);
          let result = dataType.decode(Buffer.from(data, 'base64'));
          result = dataType.toObject(result, {
            enums: String, // enums as string names
            longs: String, // longs as strings (requires long.js)
            bytes: String, // bytes as base64 encoded strings
            defaults: true, // includes default values
            arrays: true, // populates empty arrays (repeated fields) even if defaults=false
            objects: true, // populates empty objects (map fields) even if defaults=false
            oneofs: true // includes virtual oneof fields set to the present field's name
          });
          Object.entries(dataType.fields).forEach(([fieldName, field]) => {
            const fieldValue = result[fieldName];
            if (fieldValue === null || fieldValue === undefined) {
              return;
            }
            if (field.type === '.aelf.Address' && typeof fieldValue !== 'string') {
              result[fieldName] = AElf.pbUtils.getRepForAddress(fieldValue);
            }
            if (field.type === '.aelf.Hash' && typeof fieldValue !== 'string') {
              result[fieldName] = AElf.pbUtils.getRepForHash(fieldValue);
            }
          });
          delete log.Indexed;
          logs[index] = {
            ...log,
            Result: result
          };
          // logsResult.push(result);
        }
        this.oraInstance.clear();
        // eslint-disable-next-line max-len
        console.log(`\n${plainLogger.info(`\nThe results returned by \nTransaction: ${txId} is: \n${JSON.stringify(logs, null, 2)}`)}`);
        this.oraInstance.succeed('Succeed!');
      }
    } catch (e) {
      this.oraInstance.fail('Failed!');
      logger.error(e);
    }
  }
}

module.exports = EventCommand;