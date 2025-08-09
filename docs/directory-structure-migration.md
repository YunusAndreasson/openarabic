Agent-Optimized Migration Plan (Fast-Path Only)

```yaml
plan_version: 1
allow_build_breakage: true
domains:
  - read
  - listen
  - practice
  - insights
  - account

aliases:
  tsconfig:
    baseUrl: '.'
    paths:
      '@read/*': ['components/read/*']
      '@listen/*': ['components/listen/*']
      '@practice/*': ['components/practice/*']
      '@insights/*': ['components/insights/*']
      '@account/*': ['components/account/*']
      '@article/*': ['components/article/*']
      '@common/*': ['components/common/*']
      '@ui/*': ['components/ui/*']
      '@charts/*': ['components/common/charts/*']
  jest.moduleNameMapper:
    '^@read/(.*)$': '<rootDir>/components/read/$1'
    '^@listen/(.*)$': '<rootDir>/components/listen/$1'
    '^@practice/(.*)$': '<rootDir>/components/practice/$1'
    '^@insights/(.*)$': '<rootDir>/components/insights/$1'
    '^@account/(.*)$': '<rootDir>/components/account/$1'
    '^@article/(.*)$': '<rootDir>/components/article/$1'
    '^@common/(.*)$': '<rootDir>/components/common/$1'
    '^@ui/(.*)$': '<rootDir>/components/ui/$1'
    '^@charts/(.*)$': '<rootDir>/components/common/charts/$1'
  babel.moduleResolver.alias:
    '@read': './components/read'
    '@listen': './components/listen'
    '@practice': './components/practice'
    '@insights': './components/insights'
    '@account': './components/account'
    '@article': './components/article'
    '@common': './components/common'
    '@ui': './components/ui'
    '@charts': './components/common/charts'

moves:
  directories:
    - { from: 'components/home', to: 'components/read' }
    - { from: 'components/vocabulary', to: 'components/practice' }
  files:
    - { from: 'components/FilterButton.tsx', to: 'components/read/FilterButton.tsx' }
    - { from: 'components/FilterSummary.tsx', to: 'components/read/FilterSummary.tsx' }
    - { from: 'components/SortingHeader.tsx', to: 'components/read/SortingHeader.tsx' }
    - { from: 'components/ArticleCard.tsx', to: 'components/read/ArticleCard.tsx' }
    - { from: 'components/BottomControls.tsx', to: 'components/listen/BottomControls.tsx' }
    - {
        from: 'components/AudioProgressIndicator.tsx',
        to: 'components/listen/AudioProgressIndicator.tsx',
      }
    - { from: 'components/BaseCard.tsx', to: 'components/common/BaseCard.tsx' }
    - { from: 'components/ProgressBar.tsx', to: 'components/common/ProgressBar.tsx' }
    - { from: 'components/ProgressCircle.tsx', to: 'components/common/ProgressCircle.tsx' }
    - { from: 'components/ListSeparator.tsx', to: 'components/common/ListSeparator.tsx' }
    - { from: 'components/SectionTitle.tsx', to: 'components/common/SectionTitle.tsx' }
    - { from: 'components/EmptyState.tsx', to: 'components/common/EmptyState.tsx' }
    - { from: 'components/ErrorState.tsx', to: 'components/common/ErrorState.tsx' }
    - { from: 'components/Pill.tsx', to: 'components/ui/Pill.tsx' }
    - { from: 'components/Toggle.tsx', to: 'components/ui/Toggle.tsx' }
    - { from: 'components/TimePicker.tsx', to: 'components/ui/TimePicker.tsx' }
  charts_commonization:
    - { from: 'components/practice/shared', to: 'components/common/charts' }
  now_playing:
    move: true
    from: 'app/NowPlaying.tsx'
    to: 'app/(tabs)/listen/now-playing.tsx'
    update_routes:
      constants.routes.ts: { NOW_PLAYING: "'/(tabs)/listen/now-playing'" }
      types.navigation.types.ts: { old: "'/NowPlaying'", new: "'/(tabs)/listen/now-playing'" }

deletions:
  - components/FilterModal.tsx
  - components/index.ts
  - services/simpleAudioService.ts
  - components/settings
  - components/home
  - components/vocabulary

codemods:
  # Read
  - rg -l "from 'components/home" | xargs -I{} sed -i "s#from 'components/home#from '@read#g" {}
  - rg -l '"components/home' | xargs -I{} sed -i "s#\"components/home#@read#g" {}
  # Practice
  - rg -l "from 'components/vocabulary" | xargs -I{} sed -i "s#from 'components/vocabulary#from '@practice#g" {}
  # Read helpers
  - rg -l "from 'components/FilterButton" | xargs -I{} sed -i "s#from 'components/FilterButton#from '@read/FilterButton#g" {}
  - rg -l "from 'components/FilterSummary" | xargs -I{} sed -i "s#from 'components/FilterSummary#from '@read/FilterSummary#g" {}
  - rg -l "from 'components/SortingHeader" | xargs -I{} sed -i "s#from 'components/SortingHeader#from '@read/SortingHeader#g" {}
  - rg -l "from 'components/ArticleCard" | xargs -I{} sed -i "s#from 'components/ArticleCard#from '@read/ArticleCard#g" {}
  # Listen helpers
  - rg -l "from 'components/BottomControls" | xargs -I{} sed -i "s#from 'components/BottomControls#from '@listen/BottomControls#g" {}
  - rg -l "from 'components/AudioProgressIndicator" | xargs -I{} sed -i "s#from 'components/AudioProgressIndicator#from '@listen/AudioProgressIndicator#g" {}
  # Common visuals
  - rg -l "from 'components/BaseCard" | xargs -I{} sed -i "s#from 'components/BaseCard#from '@common/BaseCard#g" {}
  - rg -l "from 'components/ProgressBar" | xargs -I{} sed -i "s#from 'components/ProgressBar#from '@common/ProgressBar#g" {}
  - rg -l "from 'components/ProgressCircle" | xargs -I{} sed -i "s#from 'components/ProgressCircle#from '@common/ProgressCircle#g" {}
  - rg -l "from 'components/ListSeparator" | xargs -I{} sed -i "s#from 'components/ListSeparator#from '@common/ListSeparator#g" {}
  - rg -l "from 'components/SectionTitle" | xargs -I{} sed -i "s#from 'components/SectionTitle#from '@common/SectionTitle#g" {}
  - rg -l "from 'components/EmptyState" | xargs -I{} sed -i "s#from 'components/EmptyState#from '@common/EmptyState#g" {}
  - rg -l "from 'components/ErrorState" | xargs -I{} sed -i "s#from 'components/ErrorState#from '@common/ErrorState#g" {}
  # UI utilities
  - rg -l "from 'components/Pill" | xargs -I{} sed -i "s#from 'components/Pill#from '@ui/Pill#g" {}
  - rg -l "from 'components/Toggle" | xargs -I{} sed -i "s#from 'components/Toggle#from '@ui/Toggle#g" {}
  - rg -l "from 'components/TimePicker" | xargs -I{} sed -i "s#from 'components/TimePicker#from '@ui/TimePicker#g" {}
  # Charts primitives
  - rg -l "from 'components/vocabulary/shared" | xargs -I{} sed -i "s#from 'components/vocabulary/shared#from '@charts#g" {}
  # Aggregator consumers
  - rg -n "from '@/components\b" | cat
  # Replace generic tab fallback
  - rg -l "ROUTE_PATHS\\.TABS" | xargs -I{} sed -i "s#ROUTE_PATHS.TABS#ROUTE_PATHS.READ_TAB#g" {}

eslint:
  no_restricted_imports_patterns:
    - 'components/home/*'
    - 'components/settings/*'
    - 'components/vocabulary/*'
    - 'components/vocabulary/shared/*'
    - '@/components/ArticleCard'
    - '@/components/FilterModal'
    - '@/components/BottomControls'
    - '@/components/AudioProgressIndicator'
    - '@/components/EmptyState'
    - '@/components/ErrorState'
    - '@/components/Pill'
    - '@/components/Toggle'
    - '@/components/TimePicker'
  no_restricted_syntax:
    - selector: "MemberExpression[object.name='ROUTE_PATHS'][property.name='TABS']"
      message: 'Use READ_TAB/LISTEN_TAB/PRACTICE_TAB instead of ROUTE_PATHS.TABS'

verify:
  - rg -n "components/home/|components/vocabulary/|components/settings/|ROUTE_PATHS\\.TABS" | cat
  - rg -n "from '@/components\b" | cat
  - yarn test
  - yarn validate
  - yarn knip
```
