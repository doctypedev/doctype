// Example usage of the Doctype Rust core
// Run with: node example.js

try {
  // Try to load the local build first
  const { helloWorld, getVersion, AstAnalyzer } = require('./npm/darwin-arm64');

  console.log('🦀 Doctype Rust Core - Example\n');

  // Test simple function
  console.log('1. Hello World:');
  console.log('  ', helloWorld());
  console.log();

  // Test version
  console.log('2. Version:');
  console.log('  ', getVersion());
  console.log();

  // Test AST Analyzer class
  console.log('3. AST Analyzer:');
  const analyzer = new AstAnalyzer();

  const result = analyzer.analyzeFile('src/index.ts');
  console.log('   analyzeFile:', result);

  const symbols = analyzer.getSymbols('src/index.ts');
  console.log('   getSymbols:', symbols);
  console.log();

  console.log('✅ All tests passed!');

} catch (error) {
  console.error('❌ Error loading native module:');
  console.error('  ', error.message);
  console.error('\n💡 Make sure to build first:');
  console.error('   cd crates/core && npm install && npm run build');
  process.exit(1);
}
