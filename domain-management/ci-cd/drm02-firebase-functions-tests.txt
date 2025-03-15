const { expect } = require('chai');
const admin = require('firebase-admin');
const functions = require('firebase-functions-test')();
const sinon = require('sinon');

// Import the functions to test
const { 
  roarkAuthorship, 
  blockchainIntegration, 
  cigFramework 
} = require('../index');

describe('Dr. Memoria Firebase Functions', () => {
  let adminInitStub;

  before(() => {
    // Stub admin.initializeApp to prevent actual initialization
    adminInitStub = sinon.stub(admin, 'initializeApp');
  });

  after(() => {
    // Restore the stub
    adminInitStub.restore();
  });

  describe('Roark Authorship Function', () => {
    it('should reject unauthenticated requests', async () => {
      const wrapped = functions.wrap(roarkAuthorship);
      
      try {
        await wrapped({
          workTitle: 'Test Work',
          contributionDetails: {},
          aiContributionPercentage: 0.2
        }, {
          // No authentication context
          auth: null
        });
        
        // If no error is thrown, the test should fail
        expect.fail('Should have thrown an authentication error');
      } catch (error) {
        expect(error.code).to.equal('unauthenticated');
      }
    });

    it('should reject works with excessive AI contribution', async () => {
      const wrapped = functions.wrap(roarkAuthorship);
      
      try {
        await wrapped({
          workTitle: 'Test Work',
          contributionDetails: {},
          aiContributionPercentage: 0.5  // Exceeds 30%
        }, {
          auth: { uid: 'user123' }
        });
        
        expect.fail('Should have thrown a validation error');
      } catch (error) {
        expect(error.code).to.equal('invalid-argument');
        expect(error.message).to.include('AI contribution exceeds maximum');
      }
    });

    it('should create a creative passport for valid submission', async () => {
      // Create a stub for Firestore set method
      const firestoreSetStub = sinon.stub().resolves();
      const firestoreDocStub = sinon.stub().returns({ set: firestoreSetStub });
      const firestoreCollectionStub = sinon.stub().returns({ doc: firestoreDocStub });
      
      // Stub Firestore
      sinon.stub(admin, 'firestore').returns({
        collection: firestoreCollectionStub
      });

      const wrapped = functions.wrap(roarkAuthorship);
      
      const result = await wrapped({
        workTitle: 'Valid Creative Work',
        contributionDetails: { human: 'Main narrative', ai: 'Editing assistance' },
        aiContributionPercentage: 0.2
      }, {
        auth: { uid: 'user123' }
      });

      // Verify Firestore was called
      expect(firestoreCollectionStub.calledWith('creativePassports')).to.be.true;
      expect(firestoreSetStub.calledOnce).to.be.true;

      // Verify result structure
      expect(result).to.have.property('id');
      expect(result).to.have.property('title', 'Valid Creative Work');
      expect(result).to.have.property('authorId', 'user123');
      expect(result.aiContributionPercentage).to.equal(0.2);

      // Restore stubs
      admin.firestore.restore();
    });
  });

  describe('Blockchain Integration Function', () => {
    it('should reject unauthenticated requests', async () => {
      const wrapped = functions.wrap(blockchainIntegration);
      
      try {
        await wrapped({
          creativePassportId: 'passport123'
        }, {
          auth: null
        });
        
        expect.fail('Should have thrown an authentication error');
      } catch (error) {
        expect(error.code).to.equal('unauthenticated');
      }
    });

    it('should reject non-existent creative passports', async () => {
      // Stub Firestore get method to return non-existent document
      const firestoreGetStub = sinon.stub().resolves({ exists: false });
      const firestoreDocStub = sinon.stub().returns({ get: firestoreGetStub });
      const firestoreCollectionStub = sinon.stub().returns({ doc: firestoreDocStub });
      
      sinon.stub(admin, 'firestore').returns({
        collection: firestoreCollectionStub
      });

      const wrapped = functions.wrap(blockchainIntegration);
      
      try {
        await wrapped({
          creativePassportId: 'nonexistent-passport'
        }, {
          auth: { uid: 'user123' }
        });
        
        expect.fail('Should have thrown a not-found error');
      } catch (error) {
        expect(error.code).to.equal('not-found');
      }

      // Restore stubs
      admin.firestore.restore();
    });
  });

  describe('Continuous Integration Governance Function', () => {
    it('should reject non-admin users', async () => {
      const wrapped = functions.wrap(cigFramework);
      
      try {
        await wrapped({
          repositoryUrl: 'test/repo',
          branch: 'main'
        }, {
          auth: { 
            token: { admin: false },
            uid: 'user123' 
          }
        });
        
        expect.fail('Should have thrown a permission denied error');
      } catch (error) {
        expect(error.code).to.equal('permission-denied');
      }
    });
  });
});
