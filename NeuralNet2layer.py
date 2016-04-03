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
    def __init__(self, input_dim, output_dim, epsilon):
        """
        Initializes the parameters of the neural network to random values
        """
        self.W = np.random.randn(input_dim, output_dim) / np.sqrt(input_dim)
        self.b = np.random.randn(1, output_dim)
        
        self.epsilon = epsilon # learning rate
        
    #--------------------------------------------------------------------------
    
    def compute_cost(self,X, y):
        """
        Computes the total loss on the dataset
        Sum up entropy loss for each little x
        """
        # Should decrease every iteration of training
        # x -- one training set vector
        # X -- all x's in training set
        # y -- ground truth class vector (tells index of class)

        # This calculates the diffs between input outputs across all training inputs
        num_samples = len(X)
        # Do Forward propagation to calculate our predictions
        z = X.dot(self.W) + self.b
        #exp_z = np.exp(z)
        exp_z = 1 / (1 + np.exp(-z))
        softmax_scores = exp_z / np.sum(exp_z, axis=1, keepdims=True)
        # Calculate the cross-entropy loss
        cross_ent_err = -np.log(softmax_scores[range(num_samples), y])
        data_loss = np.sum(cross_ent_err)
        return 1./num_samples * data_loss
        ###TODO:
    
    #--------------------------------------------------------------------------
 
    def predict(self,x):
        """
        Makes a prediction based on current model parameters
        """
        # Does forward propagation

        # For each output node (represented by a column in W)
        # compute the weighted sum of inputs x to it
        z = x.dot(self.W) + self.b
        exp_z = 1 / (1 + np.exp(-z))

        # Normalize the vector
        softmax_scores = exp_z / np.sum(exp_z, axis=1, keepdims=True)
        return np.argmax(softmax_scores, axis=1)
                
    #--------------------------------------------------------------------------
    
    def fit(self,X,y,num_epochs):
        """
        Learns model parameters to fit the data
        """
        num_samples = len(X)
        
        for epoch in range(num_epochs):
            # forward propagate
            # Get output vector o
            Z = np.dot(X, self.W) + self.b
            exp_z = 1 / (1 + np.exp(-Z))
            O = exp_z / np.sum(exp_z, axis=1, keepdims=True)
            
            for i, sample in enumerate(zip(X, O, y)):
                x, o, y_i = sample

                d = np.zeros(self.b.shape)
                d[0, y_i] = 1

                betas = d - o
            
                self.b += self.epsilon * (1 * (o * (1-o) * betas))
                x.shape = (2, 1)
                self.W += self.epsilon * (x * (o * (1-o) * betas))
            
        # Back propagate
        # Update weights based on gradients
            if not epoch % 500:
                print(self.compute_cost(X, y))
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
linear = True


PATH = './DATA/'
#A. linearly separable data
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

# Gradient descent parameters 
epsilon = 0.01 
num_epochs = 5000

# Fit model
#----------------------------------------------
#Uncomment following lines after implementing NeuralNet
#----------------------------------------------


NN = NeuralNet(input_dim, output_dim, epsilon)

plot_decision_boundary(lambda x: NN.predict(x))

NN.fit(X,y,num_epochs)

# Plot the decision boundary
print(NN.compute_cost(X, y))
plot_decision_boundary(lambda x: NN.predict(x))