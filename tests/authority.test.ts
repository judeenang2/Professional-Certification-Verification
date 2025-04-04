import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interactions
const mockContractCalls = {
  authorities: new Map(),
  contractOwner: '0x1234567890abcdef',
};

// Mock the contract functions
const mockContract = {
  getContractOwner: () => mockContractCalls.contractOwner,
  
  getAuthority: (authorityId: string) => {
    return mockContractCalls.authorities.get(authorityId) || null;
  },
  
  isAuthorityActive: (authorityId: string) => {
    const authority = mockContractCalls.authorities.get(authorityId);
    return authority ? authority.status === 'active' : false;
  },
  
  registerAuthority: (caller: string, authorityId: string, name: string, website: string) => {
    if (caller !== mockContractCalls.contractOwner) {
      return { error: 'ERR_UNAUTHORIZED' };
    }
    
    if (mockContractCalls.authorities.has(authorityId)) {
      return { error: 'ERR_ALREADY_REGISTERED' };
    }
    
    mockContractCalls.authorities.set(authorityId, {
      name,
      website,
      status: 'pending',
      registrationDate: Date.now(),
      lastUpdated: Date.now()
    });
    
    return { success: true };
  },
  
  updateAuthorityStatus: (caller: string, authorityId: string, newStatus: string) => {
    if (caller !== mockContractCalls.contractOwner) {
      return { error: 'ERR_UNAUTHORIZED' };
    }
    
    if (!['active', 'suspended', 'revoked'].includes(newStatus)) {
      return { error: 'ERR_INVALID_STATUS' };
    }
    
    const authority = mockContractCalls.authorities.get(authorityId);
    if (!authority) {
      return { error: 'ERR_NOT_FOUND' };
    }
    
    authority.status = newStatus;
    authority.lastUpdated = Date.now();
    mockContractCalls.authorities.set(authorityId, authority);
    
    return { success: true };
  }
};

describe('Authority Contract', () => {
  beforeEach(() => {
    // Reset the mock data before each test
    mockContractCalls.authorities.clear();
  });
  
  it('should register a new authority', () => {
    const result = mockContract.registerAuthority(
        mockContractCalls.contractOwner,
        'auth1',
        'Test Authority',
        'https://test-authority.com'
    );
    
    expect(result).toEqual({ success: true });
    expect(mockContractCalls.authorities.has('auth1')).toBe(true);
    expect(mockContractCalls.authorities.get('auth1').name).toBe('Test Authority');
  });
  
  it('should not register an authority if caller is not the contract owner', () => {
    const result = mockContract.registerAuthority(
        'unauthorized-caller',
        'auth2',
        'Unauthorized Authority',
        'https://unauthorized.com'
    );
    
    expect(result).toEqual({ error: 'ERR_UNAUTHORIZED' });
    expect(mockContractCalls.authorities.has('auth2')).toBe(false);
  });
  
  it('should not register an authority that already exists', () => {
    // First register the authority
    mockContract.registerAuthority(
        mockContractCalls.contractOwner,
        'auth3',
        'Existing Authority',
        'https://existing.com'
    );
    
    // Try to register it again
    const result = mockContract.registerAuthority(
        mockContractCalls.contractOwner,
        'auth3',
        'Duplicate Authority',
        'https://duplicate.com'
    );
    
    expect(result).toEqual({ error: 'ERR_ALREADY_REGISTERED' });
  });
  
  it('should update authority status', () => {
    // First register the authority
    mockContract.registerAuthority(
        mockContractCalls.contractOwner,
        'auth4',
        'Status Authority',
        'https://status.com'
    );
    
    // Update the status
    const result = mockContract.updateAuthorityStatus(
        mockContractCalls.contractOwner,
        'auth4',
        'active'
    );
    
    expect(result).toEqual({ success: true });
    expect(mockContractCalls.authorities.get('auth4').status).toBe('active');
  });
  
  it('should check if authority is active', () => {
    // Register and activate an authority
    mockContract.registerAuthority(
        mockContractCalls.contractOwner,
        'auth5',
        'Active Authority',
        'https://active.com'
    );
    
    mockContract.updateAuthorityStatus(
        mockContractCalls.contractOwner,
        'auth5',
        'active'
    );
    
    expect(mockContract.isAuthorityActive('auth5')).toBe(true);
    
    // Register but don't activate another authority
    mockContract.registerAuthority(
        mockContractCalls.contractOwner,
        'auth6',
        'Pending Authority',
        'https://pending.com'
    );
    
    expect(mockContract.isAuthorityActive('auth6')).toBe(false);
  });
});
