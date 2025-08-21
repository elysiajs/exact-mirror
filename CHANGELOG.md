# 0.2.1 - 22 Aug 2025
Bug fix:
- handle property name with dot

# 0.2.0 - 21 Aug 2025
Feature:
- add `createMirrorCode` to generate mirror code from schema

Improvement:
- inline unionCheck function to reduce closure reference

# 0.1.6 - 18 Aug 2025
Bug fix:
- handle optional property with special character

# 0.1.5 - 6 Aug 2025
Bug fix:
- [#23](https://github.com/elysiajs/exact-mirror/pull/23) optional properties not deleted

# 0.1.4 - 6 Aug 2025
Bug fix:
- handle nested additionalProperties

# 0.1.3 - 31 Jul 2025
Bug fix:
- handle property start with number

# 0.1.2 - 8 May Apr 2025
Feature:
- add `removeUnknownUnionType`

# 0.1.1 - 24 Apr 2025
Bug fix:
- handle reference of an union in an array

# 0.1.0 - 24 Apr 2025
Improvement:
- handle recursion from t.Ref and t.Recursive

# 0.0.9 - 24 Apr 2025
Bug fix:
- handle sanitize on top-level string

# 0.0.8 - 24 Apr 2025
Feature:
- Add sanitize options

# 0.0.7 - 22 Apr 2025
Improvement:
- Use ?. to access undefined property

# 0.0.6 - 27 Mar 2025
Improvement:
- Improve array performance by avoiding unnecessary closure reference

# 0.0.5 - 5 Mar 2025
Feature:
- support `t.Module`, `t.Ref`

# 0.0.4 - 4 Mar 2025
Bug fix:
- handle undefined union

# 0.0.3 - 4 Mar 2025
Bug fix:
- handle root array

# 0.0.2 - 4 Mar 2025
Feature:
- support Record, Tuple, Union

# 0.0.1 - 4 Mar 2025
Bug fix:
- incorrect array bracket limit
- handle deep nested optional object property
- using pointer instead of created value for

# 0.0.0 - 4 Mar 2025
Feature:
- initial release
