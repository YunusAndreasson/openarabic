# TODO

## 🚀 Features

- [ ] Add grammar rules to practice sessions
  - [ ] Integrate with existing Arabic word analysis system
  - [ ] Show grammar patterns during word review

## 🐛 Bugs

- [x] Play all, does not continue playing next audio
- [ ] Due and learning word counts not displayed correctly
  - [ ] Verify FSRS query integration
  - [ ] Check VocabularyStatCards component
- [ ] Practice session can finish early unexpectedly
  - [ ] Investigate session state management
  - [ ] Check review completion logic
- [x] Long words in practice can be cut off
  - [x] Review WordDisplay component layout
  - [x] Check text wrapping and overflow handling

## 🔧 Improvements

- [ ] Update cursor rules and documentation
  - [ ] Remove obsolete rules and outdated information
  - [ ] Create a rule that updates other rules automatically
  - [ ] Create cursor rule to find grammar patterns in codebase
  - [ ] Create cursor rule to troubleshoot practice sessions mismatch
    - [ ] Focus on word count consistency between display and actual data
    - [ ] Check FSRS state calculations vs UI rendering
    - [ ] Document previous attempts in repository
- [ ] Implement audio transition improvements
  - [x] Add title and summary
  - [ ] Add word timestamps
  - [x] Add 500ms pause between sentences for arabic
- [ ] Improve the grammar rules system
  - [ ] Highlight tashkeel (diacritical marks) properly
  - [ ] Verify correctness of pattern matching
  - [ ] Improve instructions to the AI
  - [ ] Add more rules based on discovered patterns
  - [ ] Create cursor rule for this
  - [ ] Integrate with existing Arabic word components
- [ ] Reconstruct `essential` word analysis to use root extraction
  - [ ] Use `camel_tools` service to extract Arabic roots
  - [ ] Verify accuracy with GPT-5 analysis
  - [ ] Integrate with existing word analysis pipeline
- [x] Remove study icon and highlight border
- [ ] Clean up
  - [x] Make sure all logic to timestamp is removed

## Resources

https://github.com/WannabeQuadrilingual/HansWehrDictionary
