import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  message: string;
  timestamp: number;
}

export function successResponse<T>(
  data: T,
  message = "success"
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    code: 200,
    data,
    message,
    timestamp: Date.now(),
  });
}

export function errorResponse(
  code: number,
  message: string,
  data: unknown = null
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code,
      data,
      message,
      timestamp: Date.now(),
    },
    { status: code }
  );
}

export function badRequestResponse(
  message = "Bad Request",
  data?: unknown
): NextResponse<ApiResponse> {
  return errorResponse(400, message, data);
}

export function unauthorizedResponse(
  message = "Unauthorized"
): NextResponse<ApiResponse> {
  return errorResponse(401, message);
}

export function forbiddenResponse(
  message = "Forbidden"
): NextResponse<ApiResponse> {
  return errorResponse(403, message);
}

export function notFoundResponse(
  message = "Not Found"
): NextResponse<ApiResponse> {
  return errorResponse(404, message);
}

export function tooManyRequestsResponse(
  message = "Too Many Requests",
  retryAfter = 60
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code: 429,
      data: null,
      message,
      timestamp: Date.now(),
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

export function serverErrorResponse(
  message = "Internal Server Error"
): NextResponse<ApiResponse> {
  return errorResponse(500, message);
}
