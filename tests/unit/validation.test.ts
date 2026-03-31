/**
 * Unit tests for validation schemas.
 * Tests Zod schema validation for all inputs.
 */

import {
  usernameSchema,
  passwordSchema,
  postContentSchema,
  replyContentSchema,
  emailSchema,
  bioSchema,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('usernameSchema', () => {
    it('should accept valid usernames', () => {
      const validUsernames = [
        'user123',
        'john_doe',
        'alice',
        'test_user_123',
        '_underscore_start',
        'abc', // minimum 3 chars
      ];

      validUsernames.forEach((username) => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab', // too short (< 3)
        'a'.repeat(31), // too long (> 30)
        'user@domain', // contains @
        'user.name', // contains .
        'user-name', // contains -
        'user name', // contains space
        '', // empty
      ];

      invalidUsernames.forEach((username) => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(false);
      });
    });

    it('should enforce length constraints', () => {
      expect(usernameSchema.safeParse('a'.repeat(2)).success).toBe(false); // < 3
      expect(usernameSchema.safeParse('a'.repeat(3)).success).toBe(true); // = 3 (min)
      expect(usernameSchema.safeParse('a'.repeat(30)).success).toBe(true); // = 30 (max)
      expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false); // > 30
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'Password123!',
        'MyPass@123',
        'Test1234!@#',
        'Secure^Pass9',
      ];

      validPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid passwords', () => {
      const invalidPasswords = [
        'pass', // too short (< 8)
        'password', // no uppercase, no digit, no special
        'PASSWORD123', // no lowercase
        'password123', // no uppercase
        'Password', // no digit
        'Password1', // no special character
      ];

      invalidPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
      });
    });

    it('should enforce all requirements', () => {
      // Missing each requirement should fail
      expect(passwordSchema.safeParse('password123!').success).toBe(false); // no uppercase
      expect(passwordSchema.safeParse('PASSWORD123!').success).toBe(false); // no lowercase
      expect(passwordSchema.safeParse('Password!').success).toBe(false); // no digit
      expect(passwordSchema.safeParse('Password123').success).toBe(false); // no special

      // All requirements should pass
      expect(passwordSchema.safeParse('Password123!').success).toBe(true);
    });
  });

  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@domain.org',
      ];

      validEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'notanemail',
        'user@',
        '@example.com',
        'user @example.com',
      ];

      invalidEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('postContentSchema', () => {
    it('should accept valid post content', () => {
      const validContent = [
        'Hello world!', // typical post
        'Short', // minimal
        'x'.repeat(500), // maximum
        'This is a longer post with some text about microblogging',
      ];

      validContent.forEach((content) => {
        const result = postContentSchema.safeParse(content);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid post content', () => {
      const invalidContent = [
        '', // empty
        '   ', // whitespace only
        'x'.repeat(501), // exceeds 500 chars
      ];

      invalidContent.forEach((content) => {
        const result = postContentSchema.safeParse(content);
        expect(result.success).toBe(false);
      });
    });

    it('should enforce 500 character limit', () => {
      expect(postContentSchema.safeParse('x'.repeat(500)).success).toBe(true); // exactly 500
      expect(postContentSchema.safeParse('x'.repeat(501)).success).toBe(false); // over 500
    });

    it('should reject whitespace-only content', () => {
      const whitespaceOnly = [
        '   ',
        '\t\t\t',
        '\n\n\n',
        ' ',
      ];

      whitespaceOnly.forEach((content) => {
        const result = postContentSchema.safeParse(content);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('replyContentSchema', () => {
    it('should accept valid reply content', () => {
      const validContent = [
        'That is a great point!',
        'I agree',
        'x'.repeat(500), // maximum
      ];

      validContent.forEach((content) => {
        const result = replyContentSchema.safeParse(content);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid reply content', () => {
      const invalidContent = [
        '', // empty
        '   ', // whitespace only
        'x'.repeat(501), // exceeds 500 chars
      ];

      invalidContent.forEach((content) => {
        const result = replyContentSchema.safeParse(content);
        expect(result.success).toBe(false);
      });
    });

    it('should enforce same constraints as post content', () => {
      // Replies should have same length limit as posts
      expect(replyContentSchema.safeParse('x'.repeat(500)).success).toBe(true);
      expect(replyContentSchema.safeParse('x'.repeat(501)).success).toBe(false);
      expect(replyContentSchema.safeParse('').success).toBe(false);
    });
  });

  describe('bioSchema', () => {
    it('should accept valid bio', () => {
      const validBios = [
        'I am a developer',
        'Coffee enthusiast',
        'x'.repeat(160), // maximum
        '', // optional (empty is ok)
        undefined, // optional
      ];

      validBios.forEach((bio) => {
        const result = bioSchema.safeParse(bio);
        expect(result.success).toBe(true);
      });
    });

    it('should reject bio exceeding 160 characters', () => {
      const bio = 'x'.repeat(161);
      const result = bioSchema.safeParse(bio);
      expect(result.success).toBe(false);
    });

    it('should be optional', () => {
      expect(bioSchema.safeParse(undefined).success).toBe(true);
      expect(bioSchema.safeParse('My bio').success).toBe(true);
      expect(bioSchema.safeParse('').success).toBe(true);
    });
  });
});
