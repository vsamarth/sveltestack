import { vi } from "vitest";

/**
 * Mocks for S3 operations
 */
export function mockS3Operations() {
  const mockGetSignedUrl = vi
    .fn()
    .mockResolvedValue("https://mock-presigned-url.com/file");
  const mockS3Client = {
    send: vi.fn().mockResolvedValue({}),
  };

  vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: mockGetSignedUrl,
  }));

  vi.mock("@aws-sdk/client-s3", () => ({
    S3Client: vi.fn(() => mockS3Client),
    PutObjectCommand: vi.fn((params) => ({
      ...params,
      type: "PutObjectCommand",
    })),
    GetObjectCommand: vi.fn((params) => ({
      ...params,
      type: "GetObjectCommand",
    })),
    HeadBucketCommand: vi.fn((params) => ({
      ...params,
      type: "HeadBucketCommand",
    })),
    CreateBucketCommand: vi.fn((params) => ({
      ...params,
      type: "CreateBucketCommand",
    })),
  }));

  return {
    mockGetSignedUrl,
    mockS3Client,
  };
}

/**
 * Mocks for email operations (Resend)
 */
export function mockEmailOperations() {
  const mockSendEmail = vi.fn().mockResolvedValue({
    id: "mock-email-id",
    from: "test@example.com",
    to: "recipient@example.com",
    created_at: new Date().toISOString(),
  });

  vi.mock("resend", () => ({
    Resend: vi.fn(() => ({
      emails: {
        send: mockSendEmail,
      },
    })),
  }));

  return {
    mockSendEmail,
  };
}

/**
 * Sets up all mocks for external services
 */
export function setupAllMocks() {
  const s3Mocks = mockS3Operations();
  const emailMocks = mockEmailOperations();

  return {
    ...s3Mocks,
    ...emailMocks,
  };
}
