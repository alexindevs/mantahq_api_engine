// const ivm = require('isolated-vm');

(async () => {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
  
    // Jail the global scope to prevent access to Node internals
    const jail = context.global;
    await jail.set('global', jail.derefInto());
  
    const script = `
      function customValidation(input) {
        return JSON.stringify({
          isValid: true,
          message: "Validation succeeded",
          received: input
        });
      }
      return customValidation($0);
    `;
  
    const input = { foo: 'bar' };
  
    try {
      const result = await context.evalClosure(script, [input], {
        arguments: { copy: true },
        result: { copy: true },
        timeout: 1000,
      });
  
      console.log('✅ Result:', result);
    } catch (err) {
      console.error('❌ Script Execution Failed:', err);
    }
  })();