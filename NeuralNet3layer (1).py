"""
Created on Wed Feb 10 21:56:02 2016

@author: ajjenjoshi
"""

import numpy as np
import matplotlib.pyplot as plt

class NeuralNet:
    """
    This class implements a simple 3 layer neural network.
    """
    
    def __init__(self, input_dim, hidden_dim, output_dim, epsilon, lmbda):
        """
        Initializes the parameters of the neural network to random values
        """
        self.idim = input_dim
        self.hdim = hidden_dim
        self.odim = output_dim
        
        ## Hidden Layer weights
        self.H = np.random.randn(input_dim+1, hidden_dim+1) / np.sqrt(input_dim+1)  
        #self.hb = np.zeros((1, hidden_dim))
        print(self.H)                     
        ## Random weights
        self.W = np.random.randn(hidden_dim+1, output_dim) / np.sqrt(hidden_dim+1)
        #self.b = np.zeros((1, output_dim))
        print(self.W)
        # Learning Rate
        self.epsilon = epsilon
        # Regularization paramater
        self.lmbda = lmbda
        
    #--------------------------------------------------------------------------
    
    def compute_cost(self,X, y):
        """
        Computes the total loss on the dataset
        """
        
        num_samples = len(X)
        
        # Do Forward Propagation
        if(X.shape[1] == self.idim):
            bTemp = np.ones ((num_samples,1),dtype=np.int)
            X = np.hstack([X, bTemp])
                
        h = X.dot(self.H)
        Oh = 1/ (1 + np.exp(-h))                      
                
        z = Oh.dot(self.W) #+ self.b
        exp_z = 1/ (1 + np.exp(-z))      
                         
        softmax_scores = exp_z / np.sum(exp_z, axis=1, keepdims=True)
        
        # Calculate the cross-entropy loss
        cross_ent_err = -np.log(softmax_scores[range(num_samples), y])
        data_loss = np.sum(cross_ent_err)
        
        return 1./num_samples * data_loss
    
    #--------------------------------------------------------------------------
 
    def predict(self,x):
        """
        Makes a prediction based on current model parameters
        """
        
        # Do Forward Propagation
        bTemp = np.ones ((len(x),1),dtype=np.int)
        x = np.hstack([x, bTemp])
                
        h = x.dot(self.H) #+ self.hb
        Oh = 1/ (1 + np.exp(-h))                      

        z = Oh.dot(self.W) #+ self.b
        exp_z = 1/ (1 + np.exp(-z))      
                         
        softmax_scores = exp_z / np.sum(exp_z, axis=1, keepdims=True)
      
        return np.argmax(softmax_scores, axis=1)

        
    #--------------------------------------------------------------------------
    
    def fit(self,X,y,num_epochs, L2reg=True):
        """
        Learns model parameters to fit the data
        """       
        ###TODO:
        #For each epoch
        #   Do Forward Propagation
        #   Do Back Propagation
        #   Update model parameters using gradients
        num_samples = len(X)
        weight_decay = 1 - self.epsilon * self.lmbda / num_samples        
        
        # Get ground truth vectors from y index
        dz = [[0 for x in range(2)] for x in range(y.size)] 

        for iter in range(y.size):
            if y[iter] == 0:
                dz[iter] = [1, 0]
            else:
                dz[iter] = [0, 1]   
        
        bTemp = np.ones ((num_samples,1),dtype=np.int)
        X = np.hstack([X, bTemp])
                        
        for epoch in range(num_epochs):
            # not good style ... but reset weight from input to hidden bias to be 0
            self.H[:,-1] = np.zeros(self.idim+1)

            # Do Forward Propagation
            h = X.dot(self.H) #+ self.hb
            Oh = 1/ (1 + np.exp(-h))
            
            # Make sure bias node output is 1
            Oh[:, -1] = 1              
                
            z = Oh.dot(self.W) #+ self.b
            exp_z = 1/ (1 + np.exp(-z))
              
            Oz = exp_z / np.sum(exp_z, axis=1, keepdims=True)
                                                
            # Calculate Error
            beta_z = dz - Oz

            # Perform Backpropagation for Outerlayer
            w_delta = self.epsilon * Oz*(1-Oz) * beta_z
            
            # update weights with L2 regularization
            # Regularization should not affect biases
            if L2reg: self.W[:-1] *= weight_decay
            self.W += np.dot(Oh.T,w_delta)
            
            # compute beta for hidden node, H
            h_delta = 0
                        
            for iter_in in range(len(Oz)):
                beta_h = np.zeros((self.hdim+1,1))
                temp = Oz[iter_in] *(1 - Oz[iter_in]) * beta_z[iter_in]
                temp.shape = (self.odim, 1)
                
                beta_h += np.dot(self.W, temp)
                beta_h.shape = (self.hdim+1,)
                
                x = X[iter_in]
                x.shape = (x.shape[0], 1)
                h_delta += self.epsilon * x * (Oh[iter_in]*(1-Oh[iter_in]) * beta_h)
            
            # update weights, H with L2 regularization
            # Regularization should not affect biases
            if L2reg: self.H[:-1] *= weight_decay
            self.H += h_delta
            # Regularize H
            
            
            self.H[:,-1] = np.zeros(self.idim+1)

            if not epoch % 500:
                print(self.compute_cost(X, y))
                if not epoch % 5000:
                    plot_decision_boundary(lambda x: NN.predict(x))
        

#--------------------------------------------------------------------------
#--------------------------------------------------------------------------

# Use to test effect of varying number of nodes in hidden layer
def plot_decision_boundary(pred_func):
    """
    Helper function to print the decision boundary given by model
    """
    # Set min and max values
    x_min, x_max = X[:, 0].min() - .5, X[:, 0].max() + .5
    y_min, y_max = X[:, 1].min() - .5, X[:, 1].max() + .5
    h = 0.01
    # Generate a grid of points
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h), np.arange(y_min, y_max, h))
    # Predict the function value for the whole gid
    Z = pred_func(np.c_[xx.ravel(), yy.ravel()])
    Z = Z.reshape(xx.shape)
    # Plot the contour and training examples
    plt.contourf(xx, yy, Z, cmap=plt.cm.Spectral)
    plt.scatter(X[:, 0], X[:, 1], c=y, cmap=plt.cm.Spectral)
    plt.show()

#--------------------------------------------------------------------------
#--------------------------------------------------------------------------

#Train Neural Network on
linear = False

#A. linearly separable data
#/Users/sangjoonlee/Documents/BU/CS440/PROG/prog2/Lab4/DATA
# 

#PATH = 'Z:/cs440/LABS/Lab4/Lab4/DATA/'
#PATH = '/Users/tyronehou/Documents/Class/2016 Spring/CS 440/HW/HW02/DATA/'
PATH = './DATA/'
if linear:
    #load data
    X = np.genfromtxt(PATH + 'ToyLinearX.csv', delimiter=',')
    y = np.genfromtxt(PATH + 'ToyLineary.csv', delimiter=',')
    y = y.astype(int)
    #plot data
    plt.scatter(X[:,0], X[:,1], s=40, c=y, cmap=plt.cm.Spectral)
    plt.show()
#B. Non-linearly separable data
else:
    #load data
    X = np.genfromtxt(PATH + 'ToyMoonX.csv', delimiter=',')
    y = np.genfromtxt(PATH + 'ToyMoony.csv', delimiter=',')
    y = y.astype(int)
    #plot data
    plt.scatter(X[:,0], X[:,1], s=40, c=y, cmap=plt.cm.Spectral)
    plt.show()

input_dim = 2 # input layer dimensionality
output_dim = 2 # output layer dimensionality
hidden_dim = 3 # hidden layer dimensionality

# Gradient descent parameters 
epsilon = 0.05
lmbda = 1
num_epochs = 10000

# Fit model
#----------------------------------------------
#Uncomment following lines after implementing NeuralNet
#----------------------------------------------
NN = NeuralNet(input_dim, hidden_dim, output_dim, epsilon, lmbda)
NN.fit(X,y,num_epochs, True)
#
# Plot the decision boundary
plot_decision_boundary(lambda x: NN.predict(x))
NN.compute_cost(X,y)            
    
