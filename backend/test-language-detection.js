const textExtractor = require('./services/textExtractor');

// Test cases
const testCases = [
  {
    name: 'English text',
    text: 'This is a sample English text about science and mathematics.',
    expected: 'en'
  },
  {
    name: 'Bengali text',
    text: 'এটি বিজ্ঞান এবং গণিত সম্পর্কে একটি বাংলা পাঠ্য।',
    expected: 'bn'
  },
  {
    name: 'Mixed text with majority Bengali',
    text: 'বাংলাদেশ দক্ষিণ এশিয়ার একটি সার্বভৌম রাষ্ট্র। Bangladesh is a country in South Asia.',
    expected: 'bn'
  },
  {
    name: 'Mixed text with majority English',
    text: 'Bangladesh is a country in South Asia with a rich history and culture. It gained independence in 1971. বাংলা ভাষা।',
    expected: 'en'
  },
  {
    name: 'Bengali paragraph',
    text: 'বাংলাদেশের রাজধানী ঢাকা। এটি একটি প্রাণবন্ত শহর যেখানে অনেক মানুষ বাস করে। শহরটি তার সমৃদ্ধ ইতিহাস এবং সংস্কৃতির জন্য পরিচিত।',
    expected: 'bn'
  }
];

console.log('🧪 Testing Language Detection\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const detected = textExtractor.detectLanguage(testCase.text);
  const status = detected === testCase.expected ? '✅ PASS' : '❌ FAIL';
  
  if (detected === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log(`Expected: ${testCase.expected}, Detected: ${detected}`);
  console.log(`Status: ${status}`);
  console.log(`Text preview: ${testCase.text.substring(0, 50)}...`);
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed.');
  process.exit(1);
}
