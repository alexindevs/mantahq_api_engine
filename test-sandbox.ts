const ivm = require('isolated-vm');

const emailValidatorCode = `
  function customValidation(data) {
    const email = data?.body?.email;
    if (typeof email === 'string' && email.includes('@') && email.includes('.')) {
      return {
        isValid: true,
        message: "Valid email address",
        input: email
      };
    } else {
      return {
        isValid: false,
        message: "Invalid or missing email address",
        input: email
      };
    }
  }
`;

const inputData = {
  body: {
    email: 'user@example.com',
    username: 'testuser',
  },
};

(async () => {
  const timeout = parseInt(process.env.SANDBOX_TIMEOUT_MS || '100');
  const memoryLimit = parseInt(process.env.SANDBOX_MAX_MEMORY_MB || '8');
  const start = Date.now();

  try {
    const isolate = new ivm.Isolate({ memoryLimit });
    const context = await isolate.createContext();

    const jail = context.global;
    await jail.set('global', jail.derefInto());

    await jail.set('data', new ivm.ExternalCopy(inputData).copyInto({ release: true }));

    const fullScript = `
      ${emailValidatorCode}
      if (typeof customValidation !== 'function') {
        throw new Error('customValidation is not a function');
      }
      JSON.stringify(customValidation(data));
    `;

    const script = await isolate.compileScript(fullScript);

    const rawResult = await script.run(context, {
      timeout,
      result: { copy: true },
    });

    const result = JSON.parse(rawResult);
    const executionTime = Date.now() - start;

    if (
      result &&
      typeof result === 'object' &&
      typeof result.isValid === 'boolean' &&
      typeof result.message === 'string'
    ) {
      console.log('✅ Validation succeeded:', result);
      console.log('⏱ Execution time (ms):', executionTime);
    } else {
      console.error('❌ Invalid result shape:', result);
    }
  } catch (err) {
    const executionTime = Date.now() - start;
    let message = 'Unknown error';

    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'string') {
      message = err;
    } else if (err?.toString) {
      message = err.toString();
    }

    if (message.toLowerCase().includes('timeout')) {
      message = 'Script execution timed out';
    }

    console.error('🔥 Sandbox error:', message);
    console.log('⏱ Execution time (ms):', executionTime);
  }
})();
