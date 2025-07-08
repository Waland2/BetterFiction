# BetterFiction Style Guide

## JavaScript Style Guidelines

### 1. Variable Declarations
- Use `const` by default for variables that won't be reassigned
- Use `let` only when the variable needs to be reassigned
- Avoid `var` entirely
- Declare variables at the top of their scope when possible

### 2. Function Declarations
- Use `function` declarations for named functions
- Use arrow functions for anonymous functions and callbacks
- Use `async/await` instead of Promise chains when possible
- Keep functions focused and under 50 lines when possible

### 3. Promise Handling
- Always use `.catch()` for error handling
- Format Promise chains with proper indentation:
```javascript
chrome.storage.sync.get('settings')
    .then((result) => {
        // handle result
    })
    .catch((error) => {
        console.error('Error message:', error);
    });
```

### 4. Error Handling
- Always include error handling for async operations
- Use descriptive error messages in console.error() that explain what operation failed and include relevant context
- Handle errors gracefully without breaking the user experience

### 5. Code Formatting
- Use 4 spaces for indentation
- Use single quotes for strings consistently
- Add semicolons at the end of statements
- Use consistent spacing around operators and brackets
- Maximum line length: 100 characters

### 6. Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes (if any)
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names that explain the purpose

### 7. Comments
- Add comments for complex logic
- Use JSDoc style comments for functions
- Keep comments up to date with code changes

### 8. DOM Manipulation
- Cache DOM queries when used multiple times
- Use descriptive variable names for DOM elements
- Handle cases where elements might not exist

### 9. Chrome Extension Specific
- Use consistent message passing patterns
- Handle storage operations with proper error handling
- Use chrome.runtime.getURL() for resource URLs

## CSS Style Guidelines

### 1. Organization
- Group related properties together
- Use consistent property order
- Add comments for complex selectors

### 2. Naming
- Use kebab-case for class names
- Use descriptive class names
- Avoid overly specific selectors

### 3. Properties
- Use shorthand properties when possible
- Use consistent units (px, %, em, rem)
- Use consistent color formats

## HTML Style Guidelines

### 1. Structure
- Use proper DOCTYPE declaration
- Include proper meta tags
- Use semantic HTML elements
- Maintain consistent indentation

### 2. Attributes
- Use double quotes for attributes
- Order attributes consistently
- Use descriptive alt text for images

## File Organization

### 1. Directory Structure
- Keep related files together
- Use descriptive directory names
- Maintain consistent file naming

### 2. Import/Export
- Group imports at the top of files
- Use consistent import ordering
- Remove unused imports

## Performance Considerations

### 1. JavaScript
- Minimize DOM queries
- Use event delegation when appropriate
- Avoid unnecessary async operations
- Cache frequently used values

### 2. CSS
- Minimize specificity conflicts
- Use efficient selectors
- Avoid !important declarations

## Security

### 1. Content Security
- Sanitize user input
- Use safe DOM manipulation methods
- Validate data before processing

### 2. Extension Security
- Follow Chrome extension security best practices
- Validate message data
- Use appropriate permissions