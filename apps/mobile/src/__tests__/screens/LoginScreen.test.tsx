import React from 'react';
import { Pressable } from 'react-native';
import { LoginScreen } from '../../screens/auth/LoginScreen';

const mockLogin = jest.fn(async () => Promise.resolve());
const mockGoBack = jest.fn();
const mockPost = jest.fn();

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: () => ({
    login: mockLogin,
  }),
}));

jest.mock('../../api/client', () => ({
  apiClient: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

function collectPressables(node: any, acc: any[] = []): any[] {
  if (!node) return acc;

  if (Array.isArray(node)) {
    node.forEach((child) => collectPressables(child, acc));
    return acc;
  }

  if (node.type === Pressable) {
    acc.push(node);
  }

  if (node.props?.children) {
    collectPressables(node.props.children, acc);
  }

  return acc;
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits credentials and logs user in', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        token: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
        user: {
          id: '1',
          email: 'test@user.com',
          first_name: 'Test',
          last_name: 'User',
        },
      },
    });

    const useStateSpy = jest.spyOn(React, 'useState');
    useStateSpy
      .mockImplementationOnce(() => ['test@user.com', jest.fn()] as any)
      .mockImplementationOnce(() => ['Password123!', jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any);

    const tree = LoginScreen({ navigation: { goBack: mockGoBack } } as any);
    const pressables = collectPressables(tree);

    await pressables[0].props.onPress();

    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'test@user.com',
      password: 'Password123!',
    });
    expect(mockLogin).toHaveBeenCalledWith(
      'access-token',
      'refresh-token',
      expect.objectContaining({ email: 'test@user.com' })
    );

    useStateSpy.mockRestore();
  });

  it('calls goBack when back pressable is pressed', () => {
    const useStateSpy = jest.spyOn(React, 'useState');
    useStateSpy
      .mockImplementationOnce(() => ['', jest.fn()] as any)
      .mockImplementationOnce(() => ['', jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any);

    const tree = LoginScreen({ navigation: { goBack: mockGoBack } } as any);
    const pressables = collectPressables(tree);

    pressables[1].props.onPress();

    expect(mockGoBack).toHaveBeenCalledTimes(1);

    useStateSpy.mockRestore();
  });
});
